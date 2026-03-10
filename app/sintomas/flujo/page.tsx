"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SymptomsInterpretation } from "@/lib/symptoms-intake";
import { buildSymptomsOrder } from "@/lib/symptoms-order";

type StoredSymptomsDraft = {
  input: string;
  output: SymptomsInterpretation;
  engineVersion: string;
  createdAt: string;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type FlowQuestion = {
  id: string;
  prompt: string;
};

const STORAGE_KEY = "veramed_symptoms_intake_v1";
const ORDER_STORAGE_KEY = "veramed_symptoms_order_v1";
const ORDER_LOADING_MESSAGES = [
  "Consolidando tu entrevista clínica…",
  "Priorizando exámenes sugeridos para tu consulta…",
  "Armando tu resumen clínico y ficha de orden…",
  "Validando formato final de la orden…",
];

const FLOW_QUESTIONS: FlowQuestion[] = [
  {
    id: "evolution",
    prompt: "¿Desde cuándo notas estos síntomas?",
  },
  {
    id: "intensity",
    prompt: "¿Qué tanto afectan tu rutina diaria?",
  },
  {
    id: "associated",
    prompt: "¿Hay síntomas asociados relevantes?",
  },
  {
    id: "background",
    prompt: "¿Tienes algún antecedente que debamos considerar?",
  },
];

function createQuestionMessage(index: number): ChatMessage {
  const question = FLOW_QUESTIONS[index];
  return {
    id: `question-${question.id}`,
    role: "assistant",
    text: question.prompt,
  };
}

function readDraftFromStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as StoredSymptomsDraft;
  } catch {
    return null;
  }
}

export default function SintomasFlujoPage() {
  const [draft] = useState<StoredSymptomsDraft | null>(() => readDraftFromStorage());
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answerInput, setAnswerInput] = useState("");
  const [isTyping, setIsTyping] = useState(() => Boolean(readDraftFromStorage()));
  const [completed, setCompleted] = useState(false);
  const [isGeneratingOrder, setIsGeneratingOrder] = useState(false);
  const [orderProgress, setOrderProgress] = useState(0);
  const [orderMessageIndex, setOrderMessageIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const introTimeoutsRef = useRef<number[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
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
    if (!draft) {
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
      createQuestionMessage(0),
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
  }, [draft, messages.length]);

  function pushNextQuestion(nextIndex: number) {
    if (nextIndex >= FLOW_QUESTIONS.length) {
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
    setMessages((current) => [...current, createQuestionMessage(nextIndex)]);
  }

  function answerCurrentQuestion(answerText: string) {
    if (isTyping || completed) {
      return;
    }

    const currentQuestion = FLOW_QUESTIONS[questionIndex];
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

    setIsTyping(true);
    timeoutRef.current = window.setTimeout(() => {
      pushNextQuestion(questionIndex + 1);
    }, 750);
  }

  function sleep(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function handleGenerateOrder() {
    if (!draft || !completed || isGeneratingOrder) {
      return;
    }

    setIsGeneratingOrder(true);
    setOrderProgress(8);
    setOrderMessageIndex(0);

    for (let index = 0; index < ORDER_LOADING_MESSAGES.length; index += 1) {
      setOrderMessageIndex(index);
      setOrderProgress(20 + index * 20);
      // microvariaciones de tiempo para mantener naturalidad
      const delayMs = 820 + Math.floor(Math.random() * 420);
      await sleep(delayMs);
    }

    const order = buildSymptomsOrder({
      symptomsText: draft.input,
      interpretation: draft.output,
      answers,
      createdAtMs: Date.now(),
    });

    window.sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
    setOrderProgress(100);
    await sleep(320);
    window.location.href = "/sintomas/orden";
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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-5xl px-6 py-10 md:py-12">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.55)] md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Evaluación clínica guiada
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Precisemos tus síntomas
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Síntoma principal detectado:{" "}
            <span className="font-semibold text-slate-900">{draft.output.primarySymptom}</span>.
          </p>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:p-5">
            <div className="max-h-[52vh] overflow-y-auto pr-1">
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
                <div ref={endRef} />
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
                placeholder="Escribe tu respuesta..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:bg-white focus:ring-2 focus:ring-slate-200"
              />
              <button
                type="button"
                onClick={() => {
                  const cleanAnswer = answerInput.trim();
                  if (!cleanAnswer) {
                    return;
                  }
                  setAnswerInput("");
                  answerCurrentQuestion(cleanAnswer);
                }}
                disabled={!answerInput.trim() || isTyping || completed}
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
                {FLOW_QUESTIONS.map((question) => (
                  <div key={question.id} className="rounded-xl border border-emerald-100 bg-white px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {question.prompt}
                    </p>
                    <p className="mt-1 font-medium text-slate-900">{answers[question.id] ?? "Sin respuesta"}</p>
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
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
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
        </section>
      </div>
    </main>
  );
}
