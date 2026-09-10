import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";
import {
  createInitialInterviewMetadata,
  type InterviewQuestionCandidate,
  type SymptomsClinicalState,
  type SymptomsInterviewMetadata,
} from "@/lib/server/symptoms-clinical-state";
import {
  createFallbackClinicalPlan,
  findDeterministicUrgency,
  MAX_INTERVIEW_TURNS,
  MIN_INTERVIEW_TURNS,
  refillFallbackQuestionQueue,
  sanitizeInterviewAcknowledgement,
} from "@/lib/server/symptoms-interview";
import {
  ensureAnorectalDiscriminators,
  filterCandidatesForClinicalState,
  filterQuestionCandidatesForContext,
  mergeCandidateQueues,
  reconcileQuestionQueue,
  shouldCompleteAdaptiveInterview,
} from "@/lib/server/symptoms-interview-engine.mjs";
import { continueSymptomsInterviewWithOpenAI } from "@/lib/server/symptoms-openai";
import {
  getRequestAccessCookieName,
  hasValidRequestAccessCookie,
} from "@/lib/server/request-access";
import { getSymptomsRequest, saveSymptomsInterviewTurn } from "@/lib/server/symptoms-store";
import {
  enforceRateLimit,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";

export const runtime = "nodejs";

const turnBodySchema = z
  .object({
    requestId: z.string().trim().min(1).max(100),
    questionIndex: z.number().int().min(0).max(MAX_INTERVIEW_TURNS - 1),
    answer: z.string().trim().min(1).max(2_000),
  })
  .strict();

function fallbackCurrentQuestion(input: {
  question: string;
  fallbackQueue: InterviewQuestionCandidate[];
}) {
  return (
    input.fallbackQueue.find((candidate) => candidate.question === input.question) ?? {
      id: "legacy-clinical-detail",
      question: input.question,
      quickReplies: [],
      targetDomain: "clinical-detail",
      priority: 4,
      clinicalImpact: "Completa un dato clínico relevante del registro anterior.",
      impactAreas: ["differential", "testing"] as const,
      sensitive: false,
      origin: "fallback" as const,
    }
  );
}

function addDeterministicRedFlag(
  state: SymptomsClinicalState,
  reason: string,
): SymptomsClinicalState {
  if (!reason || state.redFlags.some((flag) => flag.label === reason)) return state;
  return {
    ...state,
    redFlags: [
      ...state.redFlags,
      {
        id: `deterministic-${state.redFlags.length + 1}`,
        label: reason,
        status: "present",
        priority: "high",
        source: "deterministic",
      },
    ],
  };
}

function stopReasonForMetadata(reason: string): SymptomsInterviewMetadata["stopReason"] {
  if (reason === "maximum_turns") return "maximum_turns";
  if (reason === "clinical_state_ready") return "clinical_state_ready";
  if (reason === "no_high_yield_domains") return "no_high_yield_domains";
  return "fallback_exhausted";
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await enforceRateLimit({
      request,
      action: "symptoms:interview-turn",
      limit: 24,
      windowMs: 15 * 60 * 1000,
    });

    const parsed = turnBodySchema.safeParse(await readJsonBody(request, 8_000));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Respuesta inválida para la entrevista clínica." },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const record = await getSymptomsRequest(input.requestId);
    if (!record) {
      return NextResponse.json({ error: "Solicitud de síntomas no encontrada." }, { status: 404 });
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    const user = await getUserFromSession(sessionToken);
    const requestAccessCookie = cookieStore.get(getRequestAccessCookieName())?.value;

    if (record.userId) {
      if (!user || user.id !== record.userId) {
        return NextResponse.json({ error: "No tienes acceso a esta solicitud." }, { status: 403 });
      }
    } else if (
      !hasValidRequestAccessCookie(requestAccessCookie, {
        requestType: "symptoms",
        requestId: record.id,
        createdAtMs: record.createdAt,
      })
    ) {
      return NextResponse.json({ error: "No tienes acceso a esta solicitud." }, { status: 403 });
    }

    if (!record.payment || record.payment.status !== "paid") {
      return NextResponse.json({ error: "La solicitud aún no tiene pago confirmado." }, { status: 409 });
    }
    if (record.reviewStatus !== "paid" && record.reviewStatus !== "in_flow") {
      return NextResponse.json(
        { error: "La entrevista ya fue cerrada y no admite nuevas respuestas." },
        { status: 409 },
      );
    }

    const answerKey = `q_${input.questionIndex}`;
    const existingAnswer = record.followUpAnswers[answerKey]?.trim();
    if (existingAnswer) {
      if (existingAnswer !== input.answer) {
        return NextResponse.json(
          { error: "Esta pregunta ya fue respondida. Recarga para continuar." },
          { status: 409 },
        );
      }
      const nextQuestion = record.followUpQuestions[input.questionIndex + 1] ?? "";
      const currentCandidate = record.interviewMetadata?.currentQuestion;
      return NextResponse.json({
        interview: {
          questions: record.followUpQuestions,
          answers: record.followUpAnswers,
          acknowledgement: "",
          nextQuestion,
          quickReplies: nextQuestion ? currentCandidate?.quickReplies ?? [] : [],
          completed: !nextQuestion,
          completedTurns: input.questionIndex + 1,
          minimumTurns: MIN_INTERVIEW_TURNS,
          maximumTurns: MAX_INTERVIEW_TURNS,
          urgencyWarning: record.interpretation.urgencyWarning,
          urgencyGuidance: record.interpretation.guidanceText,
          source: "idempotent-replay",
        },
        model: "idempotent-replay",
      });
    }

    const currentQuestionText = record.followUpQuestions[input.questionIndex];
    if (!currentQuestionText) {
      return NextResponse.json(
        { error: "La entrevista cambió en otra sesión. Recarga para continuar." },
        { status: 409 },
      );
    }

    const legacyPlan = createFallbackClinicalPlan({
      interpretation: record.interpretation,
      symptomsText: record.symptomsText,
      sex: record.patient.sex,
    });
    const previousState = record.clinicalState ?? legacyPlan.clinicalState;
    const previousMetadata =
      record.interviewMetadata ??
      createInitialInterviewMetadata({
        currentQuestion: fallbackCurrentQuestion({
          question: currentQuestionText,
          fallbackQueue: legacyPlan.queue,
        }),
        origin: "fallback",
        warningActive: record.interpretation.urgencyWarning,
      });
    const currentQuestion =
      previousMetadata.currentQuestion?.question === currentQuestionText
        ? previousMetadata.currentQuestion
        : fallbackCurrentQuestion({ question: currentQuestionText, fallbackQueue: legacyPlan.queue });
    const completedTurns = input.questionIndex + 1;
    const askedQuestions = record.followUpQuestions.slice(0, input.questionIndex + 1);
    const followUpQA = record.followUpQuestions
      .slice(0, input.questionIndex)
      .map((question, index) => ({
        question,
        answer: record.followUpAnswers[`q_${index}`] ?? "",
      }))
      .filter((item) => item.answer.trim())
      .concat({ question: currentQuestionText, answer: input.answer });

    const reconciled = reconcileQuestionQueue({
      state: previousState,
      queue: record.questionQueue,
      currentQuestion,
      answer: input.answer,
      askedQuestions,
      turnNumber: completedTurns,
    }) as {
      state: SymptomsClinicalState;
      queue: InterviewQuestionCandidate[];
      invalidated: boolean;
      invalidationReason: string;
      pivot: { reason: string; urgent: boolean; flowId: string } | null;
    };

    const deterministicUrgencyReason = findDeterministicUrgency([
      record.symptomsText,
      ...Object.values(record.followUpAnswers),
      input.answer,
    ]);
    let clinicalState = addDeterministicRedFlag(
      reconciled.state,
      deterministicUrgencyReason,
    );
    let workingQueue = reconciled.queue;
    let acknowledgement = "";
    let modelUrgencyWarning = false;
    let urgencyReason = deterministicUrgencyReason || reconciled.pivot?.reason || "";
    let source: "llm" | "fallback" | "fast-path" = "fast-path";
    let model = "server-queue-fast-path";
    let stopRequested = false;
    let modelInvalidated = false;
    let modelInvalidationReason = "";

    const requiresReplan = Boolean(reconciled.pivot) || workingQueue.length === 0;
    if (
      requiresReplan &&
      process.env.OPENAI_API_KEY?.trim() &&
      record.aiConsentAt &&
      record.aiConsentVersion === "ai-health-data-v1"
    ) {
      try {
        const decision = await continueSymptomsInterviewWithOpenAI({
          requestId: record.id,
          cachedInput: record.cachedInput,
          interpretation: record.interpretation,
          followUpQA,
          turnNumber: completedTurns,
          clinicalState,
          retainedQueue: workingQueue,
          currentQuestion,
          patientSex: record.patient.sex,
        });
        clinicalState = decision.clinicalState;
        workingQueue = mergeCandidateQueues({
          retained: decision.invalidatePreviousQueue ? [] : workingQueue,
          generated: filterCandidatesForClinicalState(
            filterQuestionCandidatesForContext(decision.candidateQuestions, {
              sex: record.patient.sex,
              flowId: reconciled.pivot?.flowId ?? record.flowId,
            }),
            decision.clinicalState,
          ),
          askedQuestions,
        }) as InterviewQuestionCandidate[];
        acknowledgement = sanitizeInterviewAcknowledgement(decision.acknowledgement);
        modelUrgencyWarning = decision.urgencyWarning;
        urgencyReason = deterministicUrgencyReason || decision.urgencyReason;
        stopRequested =
          decision.stopReason !== "continue" || decision.clinicalState.readyToComplete;
        modelInvalidated = decision.invalidatePreviousQueue;
        modelInvalidationReason = decision.invalidationReason;
        source = "llm";
        model = decision.model;
      } catch (error) {
        console.error("OpenAI adaptive interview fallback", {
          name: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }

    clinicalState = addDeterministicRedFlag(
      clinicalState,
      deterministicUrgencyReason || (reconciled.pivot?.urgent ? reconciled.pivot.reason : ""),
    );

    if (!stopRequested && workingQueue.length === 0) {
      workingQueue = refillFallbackQuestionQueue({
        flowId: reconciled.pivot?.flowId ?? record.flowId,
        clinicalState,
        askedQuestions,
        sex: record.patient.sex,
        symptomsText: `${record.symptomsText}\n${input.answer}`,
      });
      if (workingQueue.length > 0) {
        source = "fallback";
        model = "deterministic-map-fallback";
      }
    }

    clinicalState = {
      ...clinicalState,
      readyToComplete: clinicalState.readyToComplete || stopRequested,
    };
    const discriminators = ensureAnorectalDiscriminators({
      state: clinicalState, queue: workingQueue,
      symptomsText: [record.symptomsText, ...Object.values(record.antecedents), ...followUpQA.map(pair => pair.answer)].join("\n"),
      answeredDomains: [...previousMetadata.questionHistory.map(item => item.targetDomain), currentQuestion?.targetDomain ?? ""],
      answeredQuestions: askedQuestions,
      completedTurns,
    });
    clinicalState = discriminators.state;
    workingQueue = discriminators.queue;
    const completion = shouldCompleteAdaptiveInterview({
      completedTurns,
      state: clinicalState,
      queue: workingQueue,
    }) as { complete: boolean; reason: string };
    const completed = completion.complete || (workingQueue.length === 0 && completedTurns >= 1);
    const nextCandidate = completed ? null : workingQueue[0] ?? null;
    const remainingQueue = completed ? [] : workingQueue.slice(1, 3);
    const invalidated = reconciled.invalidated || modelInvalidated;
    const invalidationReason =
      modelInvalidationReason || reconciled.invalidationReason || "La cola fue repriorizada.";
    const urgencyWarning =
      record.interpretation.urgencyWarning ||
      modelUrgencyWarning ||
      clinicalState.redFlags.some((flag) => flag.status === "present") ||
      Boolean(urgencyReason);
    const urgencyGuidance = urgencyWarning
      ? `${urgencyReason || "Detectamos información que puede corresponder a una señal de alarma."} Te recomendamos consultar con un médico a la brevedad. Si los síntomas son intensos o progresan, acude a urgencias.`
      : record.interpretation.guidanceText;
    const nowIso = new Date().toISOString();
    const interviewMetadata: SymptomsInterviewMetadata = {
      version: "adaptive-interview-v2",
      turns: completedTurns,
      lastOrigin: source,
      lastModel: model,
      queueInvalidations: previousMetadata.queueInvalidations + (invalidated ? 1 : 0),
      invalidationEvents: invalidated
        ? [
            ...previousMetadata.invalidationEvents,
            { turn: completedTurns, reason: invalidationReason.slice(0, 300), at: nowIso },
          ].slice(-20)
        : previousMetadata.invalidationEvents,
      questionHistory: [
        ...previousMetadata.questionHistory,
        {
          turn: completedTurns,
          questionId: currentQuestion.id,
          question: currentQuestion.question,
          targetDomain: currentQuestion.targetDomain,
          origin: currentQuestion.origin,
          answeredAt: nowIso,
        },
      ].slice(-8),
      currentQuestion: nextCandidate,
      stopReason: completed
        ? stopReasonForMetadata(
            completion.complete ? completion.reason : "fallback_exhausted",
          )
        : "not_stopped",
      warningActive: urgencyWarning,
    };

    const saved = await saveSymptomsInterviewTurn({
      requestId: record.id,
      expectedQuestionIndex: input.questionIndex,
      answer: input.answer,
      nextQuestion: nextCandidate?.question ?? "",
      oneLinerSummary: clinicalState.updatedSummary || record.oneLinerSummary,
      urgencyWarning,
      urgencyGuidance,
      clinicalState,
      questionQueue: remainingQueue,
      interviewMetadata,
    });
    const savedNextQuestion = saved.followUpQuestions[input.questionIndex + 1] ?? "";

    return NextResponse.json({
      interview: {
        questions: saved.followUpQuestions,
        answers: saved.followUpAnswers,
        acknowledgement,
        nextQuestion: savedNextQuestion,
        quickReplies:
          savedNextQuestion === nextCandidate?.question ? nextCandidate?.quickReplies ?? [] : [],
        completed: !savedNextQuestion,
        completedTurns,
        minimumTurns: MIN_INTERVIEW_TURNS,
        maximumTurns: MAX_INTERVIEW_TURNS,
        urgencyWarning: saved.interpretation.urgencyWarning,
        urgencyGuidance: saved.interpretation.guidanceText,
        source,
      },
      model,
    });
  } catch (error) {
    console.error("POST /api/sintomas/interview/turn failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return httpErrorResponse(error, "No pudimos registrar esta respuesta. Intenta nuevamente.");
  }
}
