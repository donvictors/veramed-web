import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";
import {
  findDeterministicUrgency,
  isSafeAdaptiveQuestion,
  MAX_INTERVIEW_TURNS,
  MIN_INTERVIEW_TURNS,
  pickFallbackInterviewQuestion,
  sanitizeInterviewAcknowledgement,
  shouldCompleteInterview,
} from "@/lib/server/symptoms-interview";
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

function normalizeForComparison(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isRepeatedQuestion(question: string, askedQuestions: string[]) {
  const normalized = normalizeForComparison(question);
  return !normalized || askedQuestions.some((asked) => normalizeForComparison(asked) === normalized);
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
    } else {
      const hasGuestAccess = hasValidRequestAccessCookie(requestAccessCookie, {
        requestType: "symptoms",
        requestId: record.id,
        createdAtMs: record.createdAt,
      });
      if (!hasGuestAccess) {
        return NextResponse.json({ error: "No tienes acceso a esta solicitud." }, { status: 403 });
      }
    }

    if (!record.payment || record.payment.status !== "paid") {
      return NextResponse.json(
        { error: "La solicitud aún no tiene pago confirmado." },
        { status: 409 },
      );
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
      const existingNextQuestion = record.followUpQuestions[input.questionIndex + 1] ?? "";
      return NextResponse.json({
        interview: {
          questions: record.followUpQuestions,
          answers: record.followUpAnswers,
          acknowledgement: "Tu respuesta ya estaba registrada.",
          nextQuestion: existingNextQuestion,
          quickReplies: [],
          completed: !existingNextQuestion,
          completedTurns: input.questionIndex + 1,
          minimumTurns: MIN_INTERVIEW_TURNS,
          maximumTurns: MAX_INTERVIEW_TURNS,
          urgencyWarning: record.interpretation.urgencyWarning,
          urgencyGuidance: record.interpretation.guidanceText,
        },
        model: "idempotent-replay",
      });
    }

    const currentQuestion = record.followUpQuestions[input.questionIndex];
    if (!currentQuestion) {
      return NextResponse.json(
        { error: "La entrevista cambió en otra sesión. Recarga para continuar." },
        { status: 409 },
      );
    }

    const followUpQA = record.followUpQuestions
      .slice(0, input.questionIndex)
      .map((question, index) => ({
        question,
        answer: record.followUpAnswers[`q_${index}`] ?? "",
      }))
      .filter((item) => item.answer.trim())
      .concat({ question: currentQuestion, answer: input.answer });

    let acknowledgement = "Gracias, registré esa información.";
    let proposedQuestion = "";
    let quickReplies: string[] = [];
    let modelReady = false;
    let updatedSummary = record.oneLinerSummary;
    let modelUrgencyWarning = false;
    let urgencyReason = "";
    let model = "deterministic-fallback";

    if (
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
          turnNumber: input.questionIndex + 1,
        });
        acknowledgement = sanitizeInterviewAcknowledgement(decision.acknowledgement);
        proposedQuestion = isSafeAdaptiveQuestion(decision.nextQuestion)
          ? decision.nextQuestion
          : "";
        quickReplies = decision.quickReplies;
        modelReady = decision.readyToComplete;
        updatedSummary = decision.updatedSummary;
        modelUrgencyWarning = decision.urgencyWarning;
        urgencyReason = decision.urgencyReason;
        model = decision.model;
      } catch (error) {
        console.error("OpenAI adaptive interview fallback", {
          name: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }

    const askedQuestions = record.followUpQuestions.slice(0, input.questionIndex + 1);
    if (isRepeatedQuestion(proposedQuestion, askedQuestions)) {
      proposedQuestion = "";
      quickReplies = [];
    }
    const fallbackQuestion = pickFallbackInterviewQuestion({
      interpretation: record.interpretation,
      askedQuestions,
    });
    let nextQuestion = proposedQuestion || fallbackQuestion;
    const completedTurns = input.questionIndex + 1;
    const completed = shouldCompleteInterview({
      completedTurns,
      modelReady,
      hasNextQuestion: Boolean(nextQuestion),
    });
    if (completed) {
      nextQuestion = "";
      quickReplies = [];
    }

    const deterministicUrgencyReason = findDeterministicUrgency([
      record.symptomsText,
      ...Object.values(record.followUpAnswers),
      input.answer,
    ]);
    urgencyReason = deterministicUrgencyReason || urgencyReason;
    const urgencyWarning =
      record.interpretation.urgencyWarning || modelUrgencyWarning || Boolean(urgencyReason);
    const urgencyGuidance = urgencyWarning
      ? `${urgencyReason || "Detectamos información que puede corresponder a una señal de alarma."} Te recomendamos consultar con un médico a la brevedad. Si los síntomas son intensos o progresan, acude a urgencias.`
      : record.interpretation.guidanceText;

    const saved = await saveSymptomsInterviewTurn({
      requestId: record.id,
      expectedQuestionIndex: input.questionIndex,
      answer: input.answer,
      nextQuestion,
      oneLinerSummary: updatedSummary,
      urgencyWarning,
      urgencyGuidance,
    });
    const savedNextQuestion = saved.followUpQuestions[input.questionIndex + 1] ?? "";
    const savedCompleted = !savedNextQuestion;

    return NextResponse.json({
      interview: {
        questions: saved.followUpQuestions,
        answers: saved.followUpAnswers,
        acknowledgement,
        nextQuestion: savedNextQuestion,
        quickReplies: savedNextQuestion === nextQuestion ? quickReplies : [],
        completed: savedCompleted,
        completedTurns,
        minimumTurns: MIN_INTERVIEW_TURNS,
        maximumTurns: MAX_INTERVIEW_TURNS,
        urgencyWarning: saved.interpretation.urgencyWarning,
        urgencyGuidance: saved.interpretation.guidanceText,
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
