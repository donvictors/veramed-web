"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import type { SymptomsOrderDraft, StoredSymptomsIntakeDraft } from "@/lib/symptoms-order";
import { VeramedAssistantAvatar } from "@/components/VeramedAssistantAvatar";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type SymptomsRequestPayload = {
  id: string;
  oneLinerSummary: string;
  primarySymptom: string;
  followUpQuestions: string[];
  followUpAnswers: Record<string, string>;
  currentQuickReplies?: string[];
  reviewStatus: "draft" | "paid" | "in_flow" | "pending_validation" | "validated" | "rejected";
  interpretation: {
    probableContext: string;
    urgencyWarning: boolean;
    guidanceText: string;
  };
};

type InterviewTurnPayload = {
  interview: {
    questions: string[];
    answers: Record<string, string>;
    acknowledgement: string;
    nextQuestion: string;
    quickReplies: string[];
    completed: boolean;
    completedTurns: number;
    minimumTurns: number;
    maximumTurns: number;
    urgencyWarning: boolean;
    urgencyGuidance: string;
  };
};

type BuildOrderPayload = {
  order: SymptomsOrderDraft;
};

const STORAGE_KEY = "veramed_symptoms_intake_v1";
const ORDER_STORAGE_KEY = "veramed_symptoms_order_v1";
const ORDER_LOADING_MESSAGES = [
  "Consolidando tu entrevista clínica…",
  "Priorizando exámenes sugeridos para tu consulta…",
  "Armando tu resumen clínico y ficha de orden…",
  "Validando formato final de la orden…",
];

function readDraftFromStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as StoredSymptomsIntakeDraft;
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function buildPersistedMessages(request: SymptomsRequestPayload) {
  const messages: ChatMessage[] = [
    {
      id: "intro-1",
      role: "assistant",
      text: `Perfecto. Tomaremos como base: ${request.oneLinerSummary || request.interpretation.probableContext}.`,
    },
    {
      id: "intro-2",
      role: "assistant",
      text: "Conversaremos brevemente. Cada pregunta se adaptará a lo que me cuentes.",
    },
  ];

  for (let index = 0; index < request.followUpQuestions.length; index += 1) {
    messages.push({
      id: `question-${index}`,
      role: "assistant",
      text: request.followUpQuestions[index],
    });
    const answer = request.followUpAnswers[`q_${index}`]?.trim();
    if (!answer) break;
    messages.push({
      id: `user-q_${index}`,
      role: "user",
      text: answer,
    });
  }

  const isComplete =
    request.followUpQuestions.length > 0 &&
    request.followUpQuestions.every(
      (_, index) => Boolean(request.followUpAnswers[`q_${index}`]?.trim()),
    );
  if (isComplete) {
    messages.push({
      id: "assistant-final",
      role: "assistant",
      text: "Listo. Con esta información ya podemos preparar la propuesta para validación médica.",
    });
  }

  return messages;
}

function SintomasFlujoPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft] = useState<StoredSymptomsIntakeDraft | null>(() => readDraftFromStorage());
  const [requestData, setRequestData] = useState<SymptomsRequestPayload | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(true);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answerInput, setAnswerInput] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [urgencyWarning, setUrgencyWarning] = useState(false);
  const [urgencyGuidance, setUrgencyGuidance] = useState("");
  const [urgencyAcknowledged, setUrgencyAcknowledged] = useState(false);
  const [isGeneratingOrder, setIsGeneratingOrder] = useState(false);
  const [orderProgress, setOrderProgress] = useState(0);
  const [orderMessageIndex, setOrderMessageIndex] = useState(0);
  const [orderError, setOrderError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [bootstrapError, setBootstrapError] = useState("");
  const chatViewportRef = useRef<HTMLDivElement | null>(null);
  const answerInputRef = useRef<HTMLInputElement | null>(null);

  const requestId =
    searchParams.get("requestId")?.trim() || draft?.requestId?.trim() || "";

  useEffect(() => {
    window.requestAnimationFrame(() => {
      const viewport = chatViewportRef.current;
      if (!viewport) return;
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages, isTyping, completed]);

  useEffect(() => {
    if (isTyping || completed) {
      return;
    }
    const rafId = window.requestAnimationFrame(() => {
      answerInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [isTyping, completed, questionIndex, messages.length]);

  useEffect(() => {
    if (!requestId) {
      setBootstrapError("No encontramos un pago confirmado para continuar.");
      setLoadingRequest(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        setLoadingRequest(true);
        const response = await fetch(`/api/sintomas/requests/${requestId}`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | { request?: SymptomsRequestPayload; error?: string }
          | null;
        if (!response.ok || !payload?.request) {
          throw new Error(payload?.error || "No encontramos la solicitud de síntomas.");
        }
        if (cancelled) return;
        if (payload.request.reviewStatus === "draft") {
          throw new Error("El pago de esta solicitud aún no está confirmado.");
        }
        if (
          payload.request.reviewStatus === "pending_validation" ||
          payload.request.reviewStatus === "validated"
        ) {
          router.replace(`/sintomas/orden?id=${encodeURIComponent(requestId)}`);
          return;
        }
        if (!payload.request.followUpQuestions.length) {
          throw new Error("No encontramos una pregunta clínica para continuar.");
        }
        const firstUnanswered = payload.request.followUpQuestions.findIndex(
          (_, index) => !payload.request?.followUpAnswers[`q_${index}`]?.trim(),
        );
        const interviewCompleted = firstUnanswered < 0;
        setRequestData(payload.request);
        setAnswers(payload.request.followUpAnswers);
        setQuickReplies(interviewCompleted ? [] : payload.request.currentQuickReplies ?? []);
        setQuestionIndex(
          interviewCompleted ? payload.request.followUpQuestions.length - 1 : firstUnanswered,
        );
        setUrgencyWarning(payload.request.interpretation.urgencyWarning);
        setUrgencyGuidance(payload.request.interpretation.guidanceText);
        setCompleted(interviewCompleted);
        setMessages(buildPersistedMessages(payload.request));
        setIsTyping(false);
      } catch (error) {
        if (cancelled) return;
        setBootstrapError(
          error instanceof Error ? error.message : "No pudimos cargar la evaluación clínica.",
        );
      } finally {
        if (!cancelled) {
          setLoadingRequest(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestId, router]);

  async function answerCurrentQuestion(answerText: string) {
    if (isTyping || completed) {
      return;
    }

    const currentQuestion = requestData?.followUpQuestions[questionIndex];
    if (!currentQuestion) {
      return;
    }

    const answerKey = `q_${questionIndex}`;
    const optimisticMessageId = `user-${answerKey}-${Date.now()}`;
    setMessages((current) => [
      ...current,
      {
        id: optimisticMessageId,
        role: "user",
        text: answerText,
      },
    ]);

    setAnswerInput("");
    setOrderError("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/sintomas/interview/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId, questionIndex, answer: answerText }),
      });
      const payload = (await response.json().catch(() => null)) as
        | InterviewTurnPayload
        | { error?: string }
        | null;
      if (!response.ok || !payload || !("interview" in payload)) {
        throw new Error(
          payload && "error" in payload && payload.error
            ? payload.error
            : "No pudimos registrar tu respuesta.",
        );
      }

      const interview = payload.interview;
      setAnswers(interview.answers);
      setRequestData((current) =>
        current
          ? {
              ...current,
              followUpQuestions: interview.questions,
              followUpAnswers: interview.answers,
              interpretation: {
                ...current.interpretation,
                urgencyWarning: interview.urgencyWarning,
                guidanceText: interview.urgencyGuidance,
              },
            }
          : current,
      );
      setQuickReplies(interview.quickReplies);
      setUrgencyWarning(interview.urgencyWarning);
      setUrgencyGuidance(interview.urgencyGuidance);
      setCompleted(interview.completed);

      const assistantMessages: ChatMessage[] = [];
      if (interview.acknowledgement.trim()) {
        assistantMessages.push({
          id: `ack-${questionIndex}-${Date.now()}`,
          role: "assistant",
          text: interview.acknowledgement,
        });
      }
      if (interview.completed) {
        assistantMessages.push({
          id: `assistant-final-${Date.now()}`,
          role: "assistant",
          text: "Listo. Con esta información ya podemos preparar la propuesta para validación médica.",
        });
      } else if (interview.nextQuestion) {
        assistantMessages.push({
          id: `question-${questionIndex + 1}`,
          role: "assistant",
          text: interview.nextQuestion,
        });
        setQuestionIndex(questionIndex + 1);
      }
      setMessages((current) => [...current, ...assistantMessages]);
    } catch (error) {
      setMessages((current) => current.filter((message) => message.id !== optimisticMessageId));
      setAnswerInput(answerText);
      setOrderError(error instanceof Error ? error.message : "No pudimos registrar tu respuesta.");
    } finally {
      setIsTyping(false);
    }
  }

  function handleAnswerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanAnswer = answerInput.trim();
    if (!cleanAnswer) {
      return;
    }
    void answerCurrentQuestion(cleanAnswer);
  }

  async function handleGenerateOrder() {
    if (
      !requestId ||
      !completed ||
      isGeneratingOrder ||
      (urgencyWarning && !urgencyAcknowledged)
    ) {
      return;
    }

    setIsGeneratingOrder(true);
    setOrderProgress(8);
    setOrderMessageIndex(0);
    setOrderError("");

    try {
      for (let index = 0; index < ORDER_LOADING_MESSAGES.length; index += 1) {
        setOrderMessageIndex(index);
        setOrderProgress(20 + index * 20);
        const delayMs = 820 + Math.floor(Math.random() * 420);
        await sleep(delayMs);
      }

      const response = await fetch("/api/sintomas/orders/build", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          requestId,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | BuildOrderPayload
        | { error?: string }
        | null;

      if (!response.ok || !payload || !("order" in payload)) {
        throw new Error(payload && "error" in payload && payload.error ? payload.error : "No pudimos generar la orden.");
      }

      if (!payload.order.tests?.length) {
        throw new Error(
          "No hemos identificado ningún examen para ti por ahora. Lo sentimos. Puedes editar tu relato o consultar de forma presencial.",
        );
      }

      window.sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(payload.order));
      setOrderProgress(100);
      await sleep(320);
      router.push(`/sintomas/orden?id=${encodeURIComponent(requestId)}`);
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : "No pudimos generar la orden.");
      setIsGeneratingOrder(false);
    }
  }

  if (loadingRequest) {
    return (
      <main className="veramed-page min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Evaluación clínica guiada
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Cargando tu solicitud...
          </h1>
        </div>
      </main>
    );
  }

  if (bootstrapError || !requestData) {
    return (
      <main className="veramed-page min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Evaluación clínica guiada
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            No pudimos continuar con tu evaluación
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
            {bootstrapError || "Primero necesitamos un pago confirmado para continuar."}
          </p>
          <Link
            href="/sintomas"
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Volver a síntomas
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="veramed-page min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-5xl px-6 py-10 md:py-12">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.55)] md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Entrevista clínica adaptativa
            </p>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              {Object.keys(answers).length} respuestas registradas
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Conversemos para precisar tu problema
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Síntoma principal detectado:{" "}
            <span className="font-semibold text-slate-900">{requestData.primarySymptom}</span>.
            {" "}La siguiente pregunta se elige a partir de lo que respondes.
          </p>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:p-5">
            <div ref={chatViewportRef} className="max-h-[52vh] overflow-y-auto pr-1">
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                  >
                    <div className={`flex max-w-[92%] items-start gap-2 ${message.role === "assistant" ? "" : "justify-end"}`}>
                      {message.role === "assistant" ? (
                        <VeramedAssistantAvatar />
                      ) : null}
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-7 ${
                          message.role === "assistant"
                            ? "border border-slate-200 bg-white text-slate-800"
                            : "bg-slate-900 text-white"
                        }`}
                      >
                        <p>{message.text}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping ? (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2">
                      <VeramedAssistantAvatar thinking />
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                        Revisando tu respuesta y priorizando lo clínicamente relevante…
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <label
              htmlFor="sintomas-respuesta"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
            >
              Tu respuesta en texto libre
            </label>
            <form onSubmit={handleAnswerSubmit} className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                ref={answerInputRef}
                id="sintomas-respuesta"
                value={answerInput}
                onChange={(event) => setAnswerInput(event.target.value)}
                placeholder="Escribe tu respuesta..."
                maxLength={2_000}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                disabled={isTyping || completed}
              />
              <button
                type="submit"
                disabled={!answerInput.trim() || isTyping || completed}
                className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Responder
              </button>
            </form>
            {quickReplies.length > 0 && !isTyping && !completed ? (
              <div className="mt-3 flex flex-wrap gap-2" aria-label="Respuestas rápidas">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => void answerCurrentQuestion(reply)}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:bg-slate-50"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {urgencyWarning ? (
            <aside className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
              <p className="text-sm font-semibold">Detectamos una posible señal de alarma</p>
              <p className="mt-1 text-sm leading-6">{urgencyGuidance}</p>
              <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm leading-6">
                <input
                  type="checkbox"
                  checked={urgencyAcknowledged}
                  onChange={(event) => setUrgencyAcknowledged(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-amber-400 accent-slate-950"
                />
                <span>
                  Entiendo esta advertencia y que la solicitud de una orden no reemplaza una
                  evaluación médica oportuna.
                </span>
              </label>
            </aside>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleGenerateOrder}
              disabled={
                !completed ||
                isGeneratingOrder ||
                (urgencyWarning && !urgencyAcknowledged)
              }
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Generar mi orden de exámenes
            </button>
          </div>

          {isGeneratingOrder ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                <span>Procesamiento clínico</span>
                <span>{Math.min(orderProgress, 100)}%</span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-slate-900 transition-[width] duration-300"
                  style={{ width: `${Math.min(orderProgress, 100)}%` }}
                />
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <span className="inline-block animate-spin text-base leading-none" aria-hidden="true">
                  ⌛
                </span>
                <span>{ORDER_LOADING_MESSAGES[orderMessageIndex]}</span>
              </div>
            </div>
          ) : null}

          {orderError ? (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {orderError}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function SintomasFlujoLoadingFallback() {
  return (
    <main className="veramed-page min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Evaluación clínica guiada
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Cargando tu solicitud...
        </h1>
      </div>
    </main>
  );
}

export default function SintomasFlujoPage() {
  return (
    <Suspense fallback={<SintomasFlujoLoadingFallback />}>
      <SintomasFlujoPageContent />
    </Suspense>
  );
}
