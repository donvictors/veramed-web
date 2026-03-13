"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { KeyQuestion, QuestionType } from "@/lib/clinical/types";
import type { StoredSymptomsIntakeDraft, SymptomsFlowAnswerMap, SymptomsOrderDraft } from "@/lib/symptoms-order";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type ClinicalFlowPayload = {
  flow: {
    flowId: string;
    label: string;
    keyQuestions: KeyQuestion[];
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

const FALLBACK_FLOW_QUESTIONS: KeyQuestion[] = [
  {
    id: "evolution",
    text: "¿Desde cuándo notas estos síntomas?",
    type: "text",
    required: false,
  },
  {
    id: "intensity",
    text: "¿Qué tanto afectan tu rutina diaria?",
    type: "text",
    required: false,
  },
  {
    id: "associated",
    text: "¿Hay síntomas asociados relevantes?",
    type: "text",
    required: false,
  },
  {
    id: "background",
    text: "¿Tienes algún antecedente que debamos considerar?",
    type: "text",
    required: false,
  },
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

function questionTypeHint(type: QuestionType) {
  if (type === "boolean") return "Responde Sí o No.";
  if (type === "number") return "Ingresa un número aproximado.";
  if (type === "duration") return "Indica el tiempo aproximado.";
  if (type === "multi_select") return "Puedes listar más de una opción.";
  return null;
}

function questionPrompt(question: KeyQuestion) {
  const hint = questionTypeHint(question.type);
  const parts = [question.text];
  if (question.helpText) {
    parts.push(question.helpText);
  }
  if (hint) {
    parts.push(hint);
  }
  return parts.join(" ");
}

function createQuestionMessage(question: KeyQuestion): ChatMessage {
  return {
    id: `question-${question.id}`,
    role: "assistant",
    text: questionPrompt(question),
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeBooleanFromText(raw: string) {
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (!normalized) return "No";
  if (["si", "s", "yes", "y", "true", "1"].some((value) => normalized === value || normalized.startsWith(`${value} `))) {
    return "Sí";
  }
  if (["no", "n", "false", "0"].some((value) => normalized === value || normalized.startsWith(`${value} `))) {
    return "No";
  }
  return "No";
}

function formatSummaryAnswer(question: KeyQuestion, answer: string) {
  const clean = answer.trim();
  if (!clean) return "Sin respuesta";
  if (question.type === "boolean") {
    return normalizeBooleanFromText(clean);
  }
  return clean;
}

export default function SintomasFlujoPage() {
  const [draft] = useState<StoredSymptomsIntakeDraft | null>(() => readDraftFromStorage());
  const [flowQuestions, setFlowQuestions] = useState<KeyQuestion[] | null>(null);
  const [flowLabel, setFlowLabel] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<SymptomsFlowAnswerMap>({});
  const [answerInput, setAnswerInput] = useState("");
  const [isTyping, setIsTyping] = useState(() => Boolean(readDraftFromStorage()));
  const [completed, setCompleted] = useState(false);
  const [isGeneratingOrder, setIsGeneratingOrder] = useState(false);
  const [orderProgress, setOrderProgress] = useState(0);
  const [orderMessageIndex, setOrderMessageIndex] = useState(0);
  const [orderError, setOrderError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const introTimeoutsRef = useRef<number[]>([]);
  const chatViewportRef = useRef<HTMLDivElement | null>(null);

  const activeQuestions = flowQuestions ?? [];

  useEffect(() => {
    window.requestAnimationFrame(() => {
      const viewport = chatViewportRef.current;
      if (!viewport) {
        return;
      }

      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages, isTyping, completed]);

  useEffect(() => {
    const introTimeouts = introTimeoutsRef.current;
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      introTimeouts.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    if (!draft || flowQuestions) {
      return;
    }

    const flowId = draft.output.flowId?.trim();
    if (!flowId) {
      setFlowLabel("Motivo de consulta general");
      setFlowQuestions(FALLBACK_FLOW_QUESTIONS);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/sintomas/clinical-evaluate", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            flowId,
            answers: {},
          }),
        });

        const payload = (await response.json().catch(() => null)) as ClinicalFlowPayload | null;
        if (cancelled || !response.ok || !payload?.flow) {
          throw new Error("No pudimos cargar las preguntas dirigidas.");
        }

        setFlowLabel(payload.flow.label);
        setFlowQuestions(payload.flow.keyQuestions.length > 0 ? payload.flow.keyQuestions : FALLBACK_FLOW_QUESTIONS);
      } catch {
        if (cancelled) return;
        setFlowLabel("Motivo de consulta general");
        setFlowQuestions(FALLBACK_FLOW_QUESTIONS);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [draft, flowQuestions]);

  useEffect(() => {
    if (!draft || !flowQuestions || flowQuestions.length === 0) {
      return;
    }

    if (messages.length > 0) {
      return;
    }

    const introMessages: ChatMessage[] = [
      {
        id: "intro-1",
        role: "assistant",
        text: `Perfecto. Tomaremos como base: ${draft.output.probableContext}.`,
      },
      {
        id: "intro-2",
        role: "assistant",
        text: "Te haré unas preguntas breves para precisar el recorrido clínico.",
      },
      createQuestionMessage(flowQuestions[0]),
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
  }, [draft, flowQuestions, messages.length]);

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
    setMessages((current) => [...current, createQuestionMessage(activeQuestions[nextIndex])]);
  }

  function answerCurrentQuestion(answerText: string) {
    if (isTyping || completed) {
      return;
    }

    const currentQuestion = activeQuestions[questionIndex];
    if (!currentQuestion) {
      return;
    }

    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: answerText,
    }));

    setMessages((current) => [
      ...current,
      {
        id: `user-${currentQuestion.id}-${Date.now()}`,
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

  async function handleGenerateOrder() {
    if (!draft || !completed || isGeneratingOrder) {
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
          symptomsText: draft.input,
          patient: draft.patient,
          interpretation: draft.output,
          antecedents: draft.antecedents,
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
      window.location.href = "/sintomas/orden";
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : "No pudimos generar la orden.");
      setIsGeneratingOrder(false);
    }
  }

  if (!draft) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Evaluación clínica guiada
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            No encontramos un relato de síntomas para continuar
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
            Primero necesitamos interpretar tu texto libre en la pantalla inicial de síntomas.
          </p>
          <Link
            href="/sintomas"
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Volver a escribir síntomas
          </Link>
        </div>
      </main>
    );
  }

  if (!draft.patient) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Evaluación clínica guiada
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Faltan datos del paciente para continuar
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
            Antes de continuar con el flujo guiado, necesitamos los datos del paciente para poder
            emitir la orden.
          </p>
          <Link
            href="/sintomas/pago"
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Ir a completar datos
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
            <span className="font-semibold text-slate-900">{draft.output.primarySymptom}</span>.
          </p>
          {flowLabel ? (
            <p className="text-sm leading-7 text-slate-600">
              Flujo clínico inicial: <span className="font-semibold text-slate-900">{flowLabel}</span>.
            </p>
          ) : null}

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
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id="sintomas-respuesta"
                value={answerInput}
                onChange={(event) => setAnswerInput(event.target.value)}
                placeholder={flowQuestions ? "Escribe tu respuesta..." : "Cargando preguntas..."}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                disabled={!flowQuestions || isTyping || completed}
              />
              <button
                type="button"
                onClick={() => {
                  const cleanAnswer = answerInput.trim();
                  if (!cleanAnswer) {
                    return;
                  }
                  answerCurrentQuestion(cleanAnswer);
                }}
                disabled={!answerInput.trim() || isTyping || completed || !flowQuestions}
                className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Responder
              </button>
            </div>
          </div>

          {completed ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                Resumen clínico preliminar
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                Contexto: <span className="font-semibold text-slate-900">{draft.output.probableContext}</span>.
              </p>
              <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                {activeQuestions.map((question) => (
                  <div key={question.id} className="rounded-xl border border-emerald-100 bg-white px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {question.text}
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {formatSummaryAnswer(question, answers[question.id] ?? "")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

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
