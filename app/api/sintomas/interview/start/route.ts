import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";
import {
  createInitialInterviewMetadata,
  type InterviewQuestionCandidate,
} from "@/lib/server/symptoms-clinical-state";
import { createFallbackClinicalPlan } from "@/lib/server/symptoms-interview";
import {
  filterCandidatesForClinicalState,
  filterQuestionCandidatesForContext,
  mergeCandidateQueues,
} from "@/lib/server/symptoms-interview-engine.mjs";
import { continueSymptomsInterviewWithOpenAI } from "@/lib/server/symptoms-openai";
import {
  getRequestAccessCookieName,
  hasValidRequestAccessCookie,
} from "@/lib/server/request-access";
import {
  getSymptomsRequest,
  initializePaidSymptomsInterview,
} from "@/lib/server/symptoms-store";
import {
  enforceRateLimit,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";

export const runtime = "nodejs";

const bodySchema = z.object({ requestId: z.string().trim().min(1).max(100) }).strict();

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await enforceRateLimit({
      request,
      action: "symptoms:interview-start",
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    const parsed = bodySchema.safeParse(await readJsonBody(request, 2_000));
    if (!parsed.success) {
      return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
    }
    const record = await getSymptomsRequest(parsed.data.requestId);
    if (!record) {
      return NextResponse.json({ error: "Solicitud de síntomas no encontrada." }, { status: 404 });
    }

    const cookieStore = await cookies();
    const user = await getUserFromSession(cookieStore.get(AUTH_SESSION_COOKIE)?.value);
    const accessCookie = cookieStore.get(getRequestAccessCookieName())?.value;
    if (record.userId) {
      if (!user || user.id !== record.userId) {
        return NextResponse.json({ error: "No tienes acceso a esta solicitud." }, { status: 403 });
      }
    } else if (!hasValidRequestAccessCookie(accessCookie, {
      requestType: "symptoms",
      requestId: record.id,
      createdAtMs: record.createdAt,
    })) {
      return NextResponse.json({ error: "No tienes acceso a esta solicitud." }, { status: 403 });
    }
    if (!record.payment || record.payment.status !== "paid") {
      return NextResponse.json({ error: "La solicitud aún no tiene pago confirmado." }, { status: 409 });
    }
    if (record.reviewStatus !== "paid" && record.reviewStatus !== "in_flow") {
      return NextResponse.json({ error: "La entrevista ya fue cerrada." }, { status: 409 });
    }

    const hasAnswers = Object.values(record.followUpAnswers).some((answer) => answer.trim());
    if (hasAnswers || record.interviewMetadata?.lastModel === "gpt-5.6-luna") {
      return NextResponse.json({
        interview: {
          questions: record.followUpQuestions,
          answers: record.followUpAnswers,
          quickReplies: record.interviewMetadata?.currentQuestion?.quickReplies ?? [],
          urgencyWarning: record.interpretation.urgencyWarning,
          urgencyGuidance: record.interpretation.guidanceText,
        },
        model: record.interviewMetadata?.lastModel ?? "existing-plan",
      });
    }

    const fallbackPlan = createFallbackClinicalPlan({
      interpretation: record.interpretation,
      symptomsText: record.symptomsText,
      sex: record.patient.sex,
    });
    const previousState = record.clinicalState ?? fallbackPlan.clinicalState;
    const decision = await continueSymptomsInterviewWithOpenAI({
      requestId: record.id,
      cachedInput: record.cachedInput,
      interpretation: record.interpretation,
      followUpQA: [],
      turnNumber: 0,
      clinicalState: previousState,
      retainedQueue: [],
      currentQuestion: null,
      patientSex: record.patient.sex,
    });
    const candidates = mergeCandidateQueues({
      retained: [],
      generated: filterCandidatesForClinicalState(
        filterQuestionCandidatesForContext(decision.candidateQuestions, {
          sex: record.patient.sex,
          flowId: record.flowId,
        }),
        decision.clinicalState,
      ),
      askedQuestions: [],
    }) as InterviewQuestionCandidate[];
    const selectedCandidates = candidates.length > 0 ? candidates : fallbackPlan.queue;
    const metadata = createInitialInterviewMetadata({
      currentQuestion: selectedCandidates[0] ?? null,
      origin: candidates.length > 0 ? "llm" : "fallback",
      model: candidates.length > 0 ? decision.model : "deterministic-map-fallback",
      warningActive: record.interpretation.urgencyWarning || decision.urgencyWarning,
    });
    const urgencyWarning = record.interpretation.urgencyWarning || decision.urgencyWarning;
    const urgencyGuidance = urgencyWarning
      ? `${decision.urgencyReason || "Detectamos información que puede corresponder a una señal de alarma."} Te recomendamos consultar con un médico a la brevedad. Si los síntomas son intensos o progresan, acude a urgencias.`
      : record.interpretation.guidanceText;
    const saved = await initializePaidSymptomsInterview({
      requestId: record.id,
      clinicalState: decision.clinicalState,
      candidateQuestions: selectedCandidates,
      interviewMetadata: metadata,
      urgencyWarning,
      urgencyGuidance,
    });

    return NextResponse.json({
      interview: {
        questions: saved.followUpQuestions,
        answers: saved.followUpAnswers,
        quickReplies: saved.interviewMetadata?.currentQuestion?.quickReplies ?? [],
        urgencyWarning: saved.interpretation.urgencyWarning,
        urgencyGuidance: saved.interpretation.guidanceText,
      },
      model: saved.interviewMetadata?.lastModel ?? decision.model,
    });
  } catch (error) {
    console.error("POST /api/sintomas/interview/start failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return httpErrorResponse(error, "No pudimos iniciar la entrevista clínica. Intenta nuevamente.");
  }
}
