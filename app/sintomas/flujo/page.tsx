"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { SymptomsOrderDraft, StoredSymptomsIntakeDraft } from "@/lib/symptoms-order";

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
  reviewStatus: "draft" | "paid" | "in_flow" | "pending_validation" | "validated" | "rejected";
  interpretation: {
    probableContext: string;
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

const FALLBACK_QUESTIONS = [
  "¿Desde cuándo notas estos síntomas?",
  "¿Han empeorado, mejorado o se mantienen igual?",
  "¿Hay algún factor que alivie o empeore los síntomas?",
  "¿Hay algún antecedente adicional que debamos considerar?",
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

function SintomasFlujoPageContent() {
  const searchParams = useSearchParams();
  const [draft] = useState<StoredSymptomsIntakeDraft | null>(() => readDraftFromStorage());
  const [requestData, setRequestData] = useState<SymptomsRequestPayload | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(true);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answerInput, setAnswerInput] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [isGeneratingOrder, setIsGeneratingOrder] = useState(false);
  const [orderProgress, setOrderProgress] = useState(0);
  const [orderMessageIndex, setOrderMessageIndex] = useState(0);
  const [orderError, setOrderError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [bootstrapError, setBootstrapError] = useState("");
  const timeoutRef = useRef<number | null>(null);
  const introTimeoutsRef = useRef<number[]>([]);
  const chatViewportRef = useRef<HTMLDivElement | null>(null);
  const answerInputRef = useRef<HTMLInputElement | null>(null);

  const requestId =
    searchParams.get("requestId")?.trim() || draft?.requestId?.trim() || "";
  const activeQuestions = useMemo(() => {
    const list = requestData?.followUpQuestions ?? [];
    return list.length > 0 ? list : FALLBACK_QUESTIONS;
  }, [requestData?.followUpQuestions]);

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
    const introTimeoutIds = introTimeoutsRef.current;
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      introTimeoutIds.forEach((id) => window.clearTimeout(id));
    };
  }, []);

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
          window.location.href = `/sintomas/orden?id=${encodeURIComponent(requestId)}`;
          return;
        }
        setRequestData(payload.request);
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
  }, [requestId]);

  useEffect(() => {
    if (!requestData || messages.length > 0 || bootstrapError) {
      return;
    }

    const introMessages: ChatMessage[] = [
      {
        id: "intro-1",
        role: "assistant",
        text: `Perfecto. Tomaremos como base: ${requestData.oneLinerSummary || requestData.interpretation.probableContext}.`,
      },
      {
        id: "intro-2",
        role: "assistant",
        text: "Te haré unas preguntas breves para precisar el recorrido clínico.",
      },
      {
        id: "question-0",
        role: "assistant",
        text: activeQuestions[0],
      },
    ];

    let cumulativeDelay = 350;
    introMessages.forEach((message, index) => {
      cumulativeDelay += index === 0 ? 900 : 1000;
      const timeoutId = window.setTimeout(() => {
        setMessages((current) => [...current, message]);
        if (index === introMessages.length - 1) {
          setIsTyping(false);
        }
      }, cumulativeDelay);
      introTimeoutsRef.current.push(timeoutId);
    });
  }, [activeQuestions, bootstrapError, messages.length, requestData]);

  function pushNextQuestion(nextIndex: number) {
    if (nextIndex >= activeQuestions.length) {
      setCompleted(true);
      setIsTyping(false);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-final-${Date.now()}`,
          role: "assistant",
          text: "Listo. Con esta información ya podemos continuar con la validación médica de tu orden.",
        },
      ]);
      return;
    }

    setQuestionIndex(nextIndex);
    setIsTyping(false);
    setMessages((current) => [
      ...current,
      {
        id: `question-${nextIndex}`,
        role: "assistant",
        text: activeQuestions[nextIndex],
      },
    ]);
  }

  function answerCurrentQuestion(answerText: string) {
    if (isTyping || completed) {
      return;
    }

    const currentQuestion = activeQuestions[questionIndex];
    if (!currentQuestion) {
      return;
    }

    const answerKey = `q_${questionIndex}`;
    setAnswers((current) => ({
      ...current,
      [answerKey]: answerText,
    }));

    setMessages((current) => [
      ...current,
      {
        id: `user-${answerKey}-${Date.now()}`,
        role: "user",
        text: answerText,
      },
    ]);

    setAnswerInput("");
    setOrderError("");
    setIsTyping(true);
    timeoutRef.current = window.setTimeout(() => {
      pushNextQuestion(questionIndex + 1);
    }, 760);
  }

  function handleAnswerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanAnswer = answerInput.trim();
    if (!cleanAnswer) {
      return;
    }
    answerCurrentQuestion(cleanAnswer);
  }

  async function handleGenerateOrder() {
    if (!requestId || !completed || isGeneratingOrder) {
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
          answers,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | BuildOrderPayload
        | { error?: string }
        | null;

      if (!response.ok || !payload || !("order" in payload)) {
        throw new Error(payload && "error" in payload && payload.error ? payload.error : "No pudimos generar la orden.");
      }

      window.sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(payload.order));
      setOrderProgress(100);
      await sleep(320);
      window.location.href = `/sintomas/orden?id=${encodeURIComponent(requestId)}`;
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : "No pudimos generar la orden.");
      setIsGeneratingOrder(false);
    }
  }

  if (loadingRequest) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
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
      <main className="min-h-screen bg-slate-50 text-slate-900">
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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-5xl px-6 py-10 md:py-12">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.55)] md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Evaluación clínica guiada
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Vamos a precisar tu problema con unas preguntas
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Síntoma principal detectado:{" "}
            <span className="font-semibold text-slate-900">{requestData.primarySymptom}</span>.
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
                        <span
                          aria-hidden="true"
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm"
                        >
                          🤖
                        </span>
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
                      <span
                        aria-hidden="true"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm"
                      >
                        🤖
                      </span>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                        Ordenando tu respuesta...
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
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleGenerateOrder}
              disabled={!completed || isGeneratingOrder}
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
    <main className="min-h-screen bg-slate-50 text-slate-900">
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
