"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";
import type { SymptomsInterpretation } from "@/lib/symptoms-intake";

type ProcessingState = "idle" | "antecedents" | "processing" | "ready";

type AntecedentKey =
  | "medicalHistory"
  | "surgicalHistory"
  | "chronicMedication"
  | "allergies";

type AntecedentAnswerMap = Record<AntecedentKey, string>;

type AntecedentMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type InterpretationPayload = {
  interpretation: SymptomsInterpretation;
  engineVersion: string;
  createdAt: string;
  nextStep?: {
    route: string;
    storageKey: string;
  };
};

const STORAGE_KEY = "veramed_symptoms_intake_v1";
const MIN_TEXT_LENGTH = 12;
const PROCESSING_MESSAGES = [
  "Leyendo lo que nos contaste…",
  "Traduciendo tus síntomas a lenguaje clínico…",
  "Tomando un café digital mientras ordenamos los síntomas…",
  "Preparando las siguientes preguntas…",
  "Casi listo...",
];
const PROCESSING_PROGRESS_POINTS = [14, 32, 54, 76, 92];
const PROCESSING_BASE_DELAYS_MS = [1200, 1450, 1300, 1550, 1200];
const ANTECEDENT_QUESTIONS: Array<{ key: AntecedentKey; prompt: string }> = [
  {
    key: "medicalHistory",
    prompt: "¿Tienes alguna enfermedad crónica?",
  },
  {
    key: "surgicalHistory",
    prompt: "¿Te han operado de algo?",
  },
  {
    key: "chronicMedication",
    prompt: "¿Tomas algún medicamento de forma crónica?",
  },
  {
    key: "allergies",
    prompt: "¿Tienes alguna alergia importante?",
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function withJitter(baseMs: number) {
  const jitter = Math.floor(Math.random() * 360) - 180;
  return Math.max(850, baseMs + jitter);
}

export default function SintomasPage() {
  const router = useRouter();
  const [symptomsText, setSymptomsText] = useState("");
  const [status, setStatus] = useState<ProcessingState>("idle");
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [result, setResult] = useState<InterpretationPayload | null>(null);
  const [error, setError] = useState("");
  const [antecedentMessages, setAntecedentMessages] = useState<AntecedentMessage[]>([]);
  const [antecedentAnswers, setAntecedentAnswers] = useState<AntecedentAnswerMap>({
    medicalHistory: "",
    surgicalHistory: "",
    chronicMedication: "",
    allergies: "",
  });
  const [antecedentInput, setAntecedentInput] = useState("");
  const [antecedentQuestionIndex, setAntecedentQuestionIndex] = useState(0);
  const [isAntecedentBotTyping, setIsAntecedentBotTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);

  const canSubmit = useMemo(
    () => symptomsText.trim().length >= MIN_TEXT_LENGTH && status !== "processing",
    [symptomsText, status],
  );

  async function runInterpretation() {
    setStatus("processing");
    setProgress(8);
    setMessageIndex(0);
    setResult(null);
    setError("");

    try {
      const responsePromise = fetch("/api/sintomas/interpret", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          symptomsText: symptomsText.trim(),
        }),
      });

      const sequencePromise = (async () => {
        for (let index = 0; index < PROCESSING_MESSAGES.length; index += 1) {
          setMessageIndex(index);
          setProgress(PROCESSING_PROGRESS_POINTS[index] ?? 92);
          await sleep(withJitter(PROCESSING_BASE_DELAYS_MS[index] ?? 700));
        }
        setProgress(96);
      })();

      const [response] = await Promise.all([responsePromise, sequencePromise]);

      const payload = (await response.json().catch(() => ({}))) as
        | InterpretationPayload
        | { error?: string };

      if (!response.ok || !("interpretation" in payload)) {
        const apiError =
          "error" in payload && payload.error
            ? payload.error
            : "No pudimos interpretar los síntomas en este momento.";
        throw new Error(apiError);
      }

      const finalizedPayload: InterpretationPayload = payload;
      window.sessionStorage.setItem(
        finalizedPayload.nextStep?.storageKey ?? STORAGE_KEY,
        JSON.stringify({
          input: symptomsText.trim(),
          antecedents: antecedentAnswers,
          output: finalizedPayload.interpretation,
          engineVersion: finalizedPayload.engineVersion,
          createdAt: finalizedPayload.createdAt,
        }),
      );

      setProgress(100);
      setMessageIndex(PROCESSING_MESSAGES.length - 1);
      setResult(finalizedPayload);
      setStatus("ready");
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "No pudimos interpretar tu relato por ahora.";
      setError(message);
      setStatus("antecedents");
    }
  }

  function startAntecedentChat() {
    setError("");
    setResult(null);
    setAntecedentInput("");
    setAntecedentQuestionIndex(0);
    setAntecedentAnswers({
      medicalHistory: "",
      surgicalHistory: "",
      chronicMedication: "",
      allergies: "",
    });
    setAntecedentMessages([
      {
        id: "ant-intro",
        role: "assistant",
        text: "Antes de continuar, te haré 4 preguntas breves de antecedentes.",
      },
      {
        id: `ant-q-${ANTECEDENT_QUESTIONS[0].key}`,
        role: "assistant",
        text: ANTECEDENT_QUESTIONS[0].prompt,
      },
    ]);
    setStatus("antecedents");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    startAntecedentChat();
  }

  function handleAntecedentAnswerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== "antecedents" || isAntecedentBotTyping) {
      return;
    }

    const answer = antecedentInput.trim();
    if (!answer) {
      return;
    }

    const currentQuestion = ANTECEDENT_QUESTIONS[antecedentQuestionIndex];
    if (!currentQuestion) {
      return;
    }

    setAntecedentAnswers((current) => ({
      ...current,
      [currentQuestion.key]: answer,
    }));

    setAntecedentMessages((current) => [
      ...current,
      {
        id: `ant-user-${currentQuestion.key}-${Date.now()}`,
        role: "user",
        text: answer,
      },
    ]);
    setAntecedentInput("");
    setIsAntecedentBotTyping(true);

    const nextIndex = antecedentQuestionIndex + 1;
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      setIsAntecedentBotTyping(false);
      if (nextIndex < ANTECEDENT_QUESTIONS.length) {
        setAntecedentQuestionIndex(nextIndex);
        setAntecedentMessages((current) => [
          ...current,
          {
            id: `ant-q-${ANTECEDENT_QUESTIONS[nextIndex].key}`,
            role: "assistant",
            text: ANTECEDENT_QUESTIONS[nextIndex].prompt,
          },
        ]);
        return;
      }

      void runInterpretation();
    }, 650);
  }

  function handleContinue() {
    router.push("/sintomas/pago");
  }

  function handleReset() {
    setStatus("idle");
    setProgress(0);
    setMessageIndex(0);
    setResult(null);
    setError("");
    setAntecedentMessages([]);
    setAntecedentInput("");
    setAntecedentQuestionIndex(0);
    setIsAntecedentBotTyping(false);
    setAntecedentAnswers({
      medicalHistory: "",
      surgicalHistory: "",
      chronicMedication: "",
      allergies: "",
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_60%)]" />
        <div className="absolute left-[-8rem] top-40 h-64 w-64 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="absolute right-[-8rem] top-16 h-72 w-72 rounded-full bg-slate-200/50 blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-col px-6 pb-16 pt-12 md:pt-16">
        <div className="mx-auto inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
          <Image src="/brand/veramed-icon.png" alt="Veramed" width={20} height={20} className="h-5 w-5" />
          Evaluación de síntomas
        </div>

        <h1 className="mt-6 text-balance text-center text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
          Escribe tus síntomas acá
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-center text-base leading-8 text-slate-600">
          Puedes escribir en texto libre lo que sientes. Usaremos IA para ordenar la información y
          guiarte hacia una evaluación clínica precisa.
        </p>

        <section className="mt-2 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.55)] md:p-8">
          {status === "idle" ? (
            <form onSubmit={handleSubmit}>
              <label htmlFor="symptoms-text" className="text-sm font-semibold text-slate-700">
                Cuéntanos qué estás sintiendo 🤖
              </label>
              <div className="relative mt-3">
                <textarea
                  id="symptoms-text"
                  value={symptomsText}
                  onChange={(event) => setSymptomsText(event.target.value)}
                  rows={8}
                  placeholder="Ej: Tengo dolor de garganta desde ayer, fiebre y me cuesta tragar."
                  className="w-full resize-y rounded-3xl border border-slate-300 bg-slate-50 px-5 py-4 text-[15px] leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:bg-white focus:ring-4 focus:ring-slate-200/70"
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Texto libre, en tus palabras. No necesitas términos médicos.</span>
                <span>{symptomsText.trim().length} caracteres</span>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Contar mis síntomas
              </button>

              {error ? (
                <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </p>
              ) : null}
            </form>
          ) : status === "antecedents" ? (
            <div>
              <p className="text-sm font-semibold text-slate-700">Antecedentes clínicos</p>
              <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="max-h-[40vh] space-y-3 overflow-y-auto pr-1">
                  {antecedentMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                    >
                      <div className="flex max-w-[92%] items-start gap-2">
                        {message.role === "assistant" ? (
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm">
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
                          {message.text}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isAntecedentBotTyping ? (
                    <div className="flex justify-start">
                      <div className="flex items-start gap-2">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm">
                          🤖
                        </span>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                          Recibido, un segundo...
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <form onSubmit={handleAntecedentAnswerSubmit} className="mt-4">
                <label
                  htmlFor="antecedent-response"
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
                >
                  Tu respuesta
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    id="antecedent-response"
                    value={antecedentInput}
                    onChange={(event) => setAntecedentInput(event.target.value)}
                    placeholder="Escribe en texto libre..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:bg-white focus:ring-2 focus:ring-slate-200"
                    disabled={isAntecedentBotTyping}
                  />
                  <button
                    type="submit"
                    disabled={!antecedentInput.trim() || isAntecedentBotTyping}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Responder
                  </button>
                </div>
              </form>
            </div>
          ) : status === "processing" ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                <span>Procesamiento clínico</span>
                <span>{Math.min(progress, 100)}%</span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-slate-900 transition-[width] duration-300"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <span className="inline-block animate-spin text-base leading-none" aria-hidden="true">
                  ⌛
                </span>
                <span>{PROCESSING_MESSAGES[messageIndex]}</span>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Interpretación inicial
              </p>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Tu relato
                </p>
                <p className="mt-2">
                  Antecedentes médicos: {antecedentAnswers.medicalHistory || "No reportado"}
                </p>
                <p>Antecedentes quirúrgicos: {antecedentAnswers.surgicalHistory || "No reportado"}</p>
                <p>Fármacos: {antecedentAnswers.chronicMedication || "No reportado"}</p>
                <p>Alergias: {antecedentAnswers.allergies || "No reportado"}</p>
                <p className="mt-2">Síntomas del paciente: {symptomsText.trim() || "No reportado"}</p>
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Entendimos tu consulta como…
              </h2>
              <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700">
                Para guiar mejor tu evaluación, organizamos tu relato en{" "}
                <span className="font-semibold text-slate-900">{result?.interpretation.probableContext}</span>.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <InfoPill label="Síntoma principal" value={result?.interpretation.primarySymptom ?? "-"} />
                <InfoPill
                  label="Motivo de consulta"
                  value={result?.interpretation.consultationFrame ?? "-"}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Etiquetas clínicas orientadoras
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result?.interpretation.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-700">{result?.interpretation.guidanceText}</p>

              {result?.interpretation.urgencyWarning ? (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Detectamos términos que podrían corresponder a síntomas de alarma. Si te sientes en
                  riesgo o con empeoramiento rápido, busca atención presencial de urgencia.
                </p>
              ) : null}

              <p className="mt-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-slate-700 ring-1 ring-emerald-100">
                Para continuar con la evaluación guiada y emitir una orden por síntomas, se realizará
                un cobro único de{" "}
                <span className="font-semibold text-slate-900">$5.990</span> antes de seguir al
                siguiente paso.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleContinue}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Continuar con evaluación
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  Editar relato
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
            Orientación ambulatoria
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
            Revisión y firma médica en la etapa final
          </span>
          <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-700">
            No apto para urgencias
          </span>
        </div>

        <p className="mt-3 text-sm text-slate-500">
          ¿Prefieres empezar con chequeo general?{" "}
          <Link href="/chequeo" className="font-semibold text-slate-900 underline">
            Ir a chequeo preventivo
          </Link>
          .
        </p>
        <p className="mt-1 text-sm text-slate-500">
          ¿O prefieres controlar tus enfermedades crónicas?{" "}
          <Link href="/control-cronico" className="font-semibold text-slate-900 underline">
            Ir a control crónico
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium leading-6 text-slate-900">{value}</p>
    </div>
  );
}
