import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { calculateAgeFromBirthDate } from "@/lib/checkup";
import { EXAM_MASTER_CATALOG } from "@/lib/exam-master-catalog";
import { getUserFromSession } from "@/lib/server/auth-store";
import { hasValidInternalAccess } from "@/lib/server/internal-access";
import {
  getRequestAccessCookieName,
  hasValidRequestAccessCookie,
} from "@/lib/server/request-access";
import { finalizeExamDecision, unavailableExamAssessment, type ClinicalSource, type ExamAudit } from "@/lib/symptoms-exam-assessment";
import { createInitialInterviewMetadata } from "@/lib/server/symptoms-clinical-state";
import { LEGACY_MIN_INTERVIEW_TURNS } from "@/lib/server/symptoms-interview";
import { toSymptomsOrderDraftFromRecord } from "@/lib/server/symptoms-order-mapper";
import { suggestSymptomsExamsWithOpenAI } from "@/lib/server/symptoms-openai";
import { getSymptomsRequest, saveSymptomsOrderDraft } from "@/lib/server/symptoms-store";
import { ensureSymptomsTests, type SymptomsFlowAnswerMap } from "@/lib/symptoms-order";

import {
  enforceRateLimit,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";

const buildOrderBodySchema = z.object({
  requestId: z.string().min(1).max(100),
}).strict();

function mapFollowUpToPairs(questions: string[], answers: SymptomsFlowAnswerMap) {
  return questions.map((question, index) => ({
    question,
    answer: answers[`q_${index}`] ?? "",
  }));
}

export async function POST(request: Request) {
  try {
  requireSameOrigin(request);
  await enforceRateLimit({ request, action: "symptoms:order-build", limit: 10, windowMs: 15 * 60 * 1000 });
  const body = await readJsonBody(request, 32_000);

  const parsed = buildOrderBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Payload inválido para construir la orden por síntomas.",
      },
      { status: 400 },
    );
  }

  const requestRecord = await getSymptomsRequest(parsed.data.requestId);
  if (!requestRecord) {
    return NextResponse.json({ error: "Solicitud de síntomas no encontrada." }, { status: 404 });
  }

  const internalAccess = hasValidInternalAccess(request, {
    requestType: "symptoms",
    requestId: requestRecord.id,
  });
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  const user = await getUserFromSession(token);
  const requestAccessCookie = cookieStore.get(getRequestAccessCookieName())?.value;

  if (requestRecord.userId && !internalAccess) {
    if (!user || user.id !== requestRecord.userId) {
      return NextResponse.json({ error: "No tienes acceso a esta solicitud." }, { status: 403 });
    }
  } else if (!requestRecord.userId && !internalAccess) {
    const hasGuestAccess = hasValidRequestAccessCookie(requestAccessCookie, {
      requestType: "symptoms",
      requestId: requestRecord.id,
      createdAtMs: requestRecord.createdAt,
    });
    if (!hasGuestAccess) {
      return NextResponse.json({ error: "No tienes acceso a esta solicitud." }, { status: 403 });
    }
  }

  if (!requestRecord.payment || requestRecord.payment.status !== "paid") {
    return NextResponse.json(
      { error: "La solicitud aún no tiene pago confirmado." },
      { status: 409 },
    );
  }

  if (
    requestRecord.reviewStatus === "pending_validation" ||
    requestRecord.reviewStatus === "validated"
  ) {
    const repairedRecord =
      requestRecord.reviewStatus === "pending_validation" && requestRecord.selectedTests.length === 0
        ? await saveSymptomsOrderDraft({
            requestId: requestRecord.id,
            followUpAnswers: requestRecord.followUpAnswers,
            suggestedTests: [],
            notes: [
              ...requestRecord.notes,
              "Se agregó un panel de respaldo porque la evaluación automática no identificó exámenes dirigidos. El médico revisor puede confirmarlo o modificarlo.",
            ],
            oneLinerSummary: requestRecord.oneLinerSummary,
            interviewMetadata: requestRecord.interviewMetadata,
          })
        : requestRecord;
    return NextResponse.json({
      order: toSymptomsOrderDraftFromRecord(repairedRecord),
      engineVersion: requestRecord.engineVersion,
      createdAt: new Date().toISOString(),
    });
  }

  const followUpAnswers = requestRecord.followUpAnswers;
  const allVisibleQuestionsAnswered = requestRecord.followUpQuestions.every(
    (_, index) => Boolean(followUpAnswers[`q_${index}`]?.trim()),
  );
  const interviewComplete = requestRecord.interviewMetadata
    ? requestRecord.interviewMetadata.stopReason !== "not_stopped" && allVisibleQuestionsAnswered
    : requestRecord.followUpQuestions.length >= LEGACY_MIN_INTERVIEW_TURNS && allVisibleQuestionsAnswered;
  if (!interviewComplete) {
    return NextResponse.json(
      { error: "Completa la entrevista clínica antes de generar la orden." },
      { status: 409 },
    );
  }
  const followUpQA = mapFollowUpToPairs(requestRecord.followUpQuestions, followUpAnswers);

  try {
    const sources: ClinicalSource[] = [
      { id: "initial", text: requestRecord.symptomsText },
      { id: "patient_context", text: `Edad: ${calculateAgeFromBirthDate(requestRecord.patient.birthDate)} años; sexo informado: ${requestRecord.patient.sex || "no informado"}.` },
      ...Object.entries(requestRecord.antecedents).filter(([, text]) => text.trim()).map(([id, text]) => ({ id: `antecedent_${id}`, text })),
      ...followUpQA.map((item, index) => ({ id: `q_${index}`, text: item.answer, question: item.question })),
    ];
    let assessment = unavailableExamAssessment(requestRecord.primarySymptom || requestRecord.symptomsText);
    let audit: ExamAudit | null = null;
    let oneLinerSummary = requestRecord.oneLinerSummary;
    let suggestionEngine = "symptoms-exams-v3-review-required";
    if (
      process.env.OPENAI_API_KEY?.trim() && requestRecord.aiConsentAt &&
      requestRecord.aiConsentVersion === "ai-health-data-v1"
    ) {
      try {
        const result = await suggestSymptomsExamsWithOpenAI({ sources, clinicalState: requestRecord.clinicalState });
        assessment = result.assessment;
        audit = result.audit;
        oneLinerSummary = result.oneLinerSummary;
        suggestionEngine = `openai-${result.model}-symptoms-exams-v3`;
      } catch (error) {
        console.error("Symptoms exam assessment requires physician review", { name: error instanceof Error ? error.name : "UnknownError" });
      }
    }
    // Adaptive q_N answers remain attached to their source rather than being mapped
    // to fixed flow IDs. The business fallback is applied only after clinical review.
    const flags = requestRecord.clinicalState?.redFlags.filter(flag => flag.status !== "absent") ?? [];
    const emergency = flags.some(flag => flag.status === "present" && flag.priority === "critical");
    const warning = flags.length > 0 || requestRecord.interpretation.urgencyWarning;
    const examDecision = finalizeExamDecision({
      assessment, audit, sources, catalogNames: EXAM_MASTER_CATALOG.map(exam => exam.name),
      safety: {
        care_level: emergency ? "emergency" : warning ? "presencial_priority" : "no_tests",
        red_flags: flags.map(flag => flag.label),
      },
    });
    const suggestedTests = ensureSymptomsTests(examDecision.accepted_tests);
    const usedDefaultTests = examDecision.accepted_tests.length === 0;
    const notes = [
      examDecision.patient_guidance,
      usedDefaultTests
        ? "Se agregó un panel de respaldo porque la evaluación automática no identificó exámenes dirigidos. El médico revisor puede confirmarlo o modificarlo."
        : "Exámenes seleccionados por utilidad clínica individual; pendientes de revisión y firma médica.",
    ];
    const interviewMetadata = {
      ...(requestRecord.interviewMetadata ?? createInitialInterviewMetadata({ currentQuestion: null, origin: "fallback", warningActive: warning })),
      examDecision,
    };

    const saved = await saveSymptomsOrderDraft({
      requestId: requestRecord.id,
      followUpAnswers,
      suggestedTests,
      notes,
      oneLinerSummary,
      interviewMetadata,
    });

    const order = toSymptomsOrderDraftFromRecord(saved);

    return NextResponse.json({
      order: {
        ...order,
        reviewStatus: saved.reviewStatus,
      },
      engineVersion: suggestionEngine,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible construir la orden por síntomas.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
  } catch (error) {
    return httpErrorResponse(error, "No fue posible construir la orden por síntomas.");
  }
}
