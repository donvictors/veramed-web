"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  calculateAgeFromBirthDate,
  formatRut,
  isValidRut,
  joinPatientFullName,
  normalizeRut,
  type PatientNameFields,
} from "@/lib/checkup";
import type { SymptomsInterpretation } from "@/lib/symptoms-intake";

type ProcessingState = "idle" | "antecedents" | "processing" | "ready";

type AntecedentKey =
  | "medicalHistory"
  | "surgicalHistory"
  | "chronicMedication"
  | "allergies"
  | "smoking"
  | "alcoholUse"
  | "drugUse"
  | "sexualActivity"
  | "firstDegreeFamilyHistory"
  | "occupation";

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

type SexSelection = "female" | "male" | "";

function formatSexLabel(value: SexSelection) {
  if (value === "female") return "Femenino";
  if (value === "male") return "Masculino";
  return "No reportado";
}

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
    prompt: "¿Tienes alguna enfermedad?",
  },
  {
    key: "surgicalHistory",
    prompt: "¿Te han operado de algo? ¿De qué?",
  },
  {
    key: "chronicMedication",
    prompt: "¿Tomas algún medicamento de forma crónica?",
  },
  {
    key: "allergies",
    prompt: "¿Tienes alguna alergia importante?",
  },
  {
    key: "smoking",
    prompt: "¿Fumas? Si tu respuesta es si, di más o menos cuánto",
  },
  {
    key: "alcoholUse",
    prompt: "¿Consumes alcohol? Si tu respuesta es si, di más o menos cuánto",
  },
  {
    key: "drugUse",
    prompt: "¿Consumes alguna droga? Si tu respuesta es si, di cuales y cada cuanto",
  },
  {
    key: "sexualActivity",
    prompt: "¿Eres activ@ sexualmente?",
  },
  {
    key: "firstDegreeFamilyHistory",
    prompt: "¿Alguna enfermedad importante en tu familia de primer grado? (padres, hermanos, hijos)",
  },
  {
    key: "occupation",
    prompt: "¿A que te dedicas?",
  },
];
const ANTECEDENT_INTRO_MESSAGE =
  "Antes de continuar, te haré unas preguntas para conocer tus antecedentes médicos.";
const ANTECEDENT_INTRO_FIRST_DELAY_MS = 360;
const ANTECEDENT_INTRO_SECOND_DELAY_MS = 1150;

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function withJitter(baseMs: number) {
  const jitter = Math.floor(Math.random() * 360) - 180;
  return Math.max(850, baseMs + jitter);
}

function normalizeBirthDateInput(nextValue: string) {
  const parts = nextValue.split("-");
  if (parts.length !== 3) {
    return nextValue;
  }

  const [year, month, day] = parts;
  if (year.length <= 4) {
    return nextValue;
  }

  return `${year.slice(-4)}-${month}-${day}`;
}

function createSymptomsRequestId(timestamp = Date.now()) {
  const now = timestamp.toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `sym_${now}${rand}`.slice(0, 26);
}

export default function SintomasPage() {
  const router = useRouter();
  const [symptomsText, setSymptomsText] = useState("");
  const [nameFields, setNameFields] = useState<PatientNameFields>({
    firstName: "",
    paternalSurname: "",
    maternalSurname: "",
  });
  const [rut, setRut] = useState("");
  const [rutNormalized, setRutNormalized] = useState("");
  const [rutTouched, setRutTouched] = useState(false);
  const [sex, setSex] = useState<SexSelection>("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
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
    smoking: "",
    alcoholUse: "",
    drugUse: "",
    sexualActivity: "",
    firstDegreeFamilyHistory: "",
    occupation: "",
  });
  const [antecedentInput, setAntecedentInput] = useState("");
  const [antecedentQuestionIndex, setAntecedentQuestionIndex] = useState(0);
  const [isAntecedentBotTyping, setIsAntecedentBotTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const introTimeoutsRef = useRef<number[]>([]);
  const antecedentChatViewportRef = useRef<HTMLDivElement | null>(null);
  const antecedentChatEndRef = useRef<HTMLDivElement | null>(null);
  const antecedentInputRef = useRef<HTMLInputElement | null>(null);
  const rutInputRef = useRef<HTMLInputElement | null>(null);

  const hasEnoughRutInput = rutNormalized.length >= 8;
  const rutIsValid = rutNormalized ? isValidRut(rutNormalized) : false;
  const showRutInvalid = Boolean(rutNormalized) && (rutTouched || hasEnoughRutInput) && !rutIsValid;
  const missingRequiredFields = useMemo(() => {
    const missing: string[] = [];
    if (!nameFields.firstName.trim()) missing.push("Nombre");
    if (!nameFields.paternalSurname.trim()) missing.push("Apellido paterno");
    if (!nameFields.maternalSurname.trim()) missing.push("Apellido materno");
    if (!rut.trim()) missing.push("RUT");
    if (!sex) missing.push("Sexo");
    if (!birthDate) missing.push("Fecha de nacimiento");
    return missing;
  }, [birthDate, nameFields, rut, sex]);

  const canSubmit = useMemo(
    () =>
      symptomsText.trim().length >= MIN_TEXT_LENGTH &&
      status !== "processing" &&
      missingRequiredFields.length === 0 &&
      rutIsValid,
    [symptomsText, status, missingRequiredFields.length, rutIsValid],
  );
  const patientAge = useMemo(() => calculateAgeFromBirthDate(birthDate), [birthDate]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      introTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      introTimeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (status !== "antecedents") {
      return;
    }

    window.requestAnimationFrame(() => {
      const viewport = antecedentChatViewportRef.current;
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: "smooth",
        });
        return;
      }

      antecedentChatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [status, antecedentMessages, isAntecedentBotTyping]);

  useEffect(() => {
    if (status !== "antecedents" || isAntecedentBotTyping) {
      return;
    }
    const rafId = window.requestAnimationFrame(() => {
      antecedentInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [status, isAntecedentBotTyping, antecedentQuestionIndex, antecedentMessages.length]);

  function clearIntroTimeouts() {
    introTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    introTimeoutsRef.current = [];
  }

  function calculateCaretPosition(formattedValue: string, normalizedLengthBeforeCaret: number) {
    if (normalizedLengthBeforeCaret <= 0) return 0;
    let seen = 0;
    for (let i = 0; i < formattedValue.length; i += 1) {
      if (/[\dK]/.test(formattedValue[i])) {
        seen += 1;
      }
      if (seen >= normalizedLengthBeforeCaret) {
        return i + 1;
      }
    }
    return formattedValue.length;
  }

  function handleRutChange(nextRawValue: string, caretPos: number | null) {
    const normalized = normalizeRut(nextRawValue);
    const formatted = formatRut(normalized);

    let nextCaretPosition = formatted.length;
    if (caretPos !== null) {
      const normalizedBeforeCaret = normalizeRut(nextRawValue.slice(0, caretPos));
      nextCaretPosition = calculateCaretPosition(formatted, normalizedBeforeCaret.length);
    }

    setRut(formatted);
    setRutNormalized(normalized);

    window.requestAnimationFrame(() => {
      if (!rutInputRef.current) return;
      rutInputRef.current.setSelectionRange(nextCaretPosition, nextCaretPosition);
    });
  }

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
          antecedents: antecedentAnswers,
          patientContext: {
            sex,
            age: patientAge,
          },
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
      const requestId = createSymptomsRequestId();
      window.sessionStorage.setItem(
        finalizedPayload.nextStep?.storageKey ?? STORAGE_KEY,
        JSON.stringify({
          requestId,
          input: symptomsText.trim(),
          patient: {
            fullName: joinPatientFullName(nameFields),
            rut,
            birthDate,
            email,
            phone,
            address,
          },
          patientSex: sex,
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
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    clearIntroTimeouts();

    setError("");
    setResult(null);
    setAntecedentInput("");
    setAntecedentQuestionIndex(0);
    setAntecedentAnswers({
      medicalHistory: "",
      surgicalHistory: "",
      chronicMedication: "",
      allergies: "",
      smoking: "",
      alcoholUse: "",
      drugUse: "",
      sexualActivity: "",
      firstDegreeFamilyHistory: "",
      occupation: "",
    });
    setAntecedentMessages([]);
    setIsAntecedentBotTyping(true);
    setStatus("antecedents");

    const introTimeout = window.setTimeout(() => {
      setAntecedentMessages((current) => [
        ...current,
        {
          id: "ant-intro",
          role: "assistant",
          text: ANTECEDENT_INTRO_MESSAGE,
        },
      ]);
    }, ANTECEDENT_INTRO_FIRST_DELAY_MS);
    introTimeoutsRef.current.push(introTimeout);

    const firstQuestionTimeout = window.setTimeout(() => {
      setAntecedentMessages((current) => [
        ...current,
        {
          id: `ant-q-${ANTECEDENT_QUESTIONS[0].key}`,
          role: "assistant",
          text: ANTECEDENT_QUESTIONS[0].prompt,
        },
      ]);
      setIsAntecedentBotTyping(false);
    }, ANTECEDENT_INTRO_SECOND_DELAY_MS);
    introTimeoutsRef.current.push(firstQuestionTimeout);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (missingRequiredFields.length > 0) {
      setError(`Completa los campos obligatorios: ${missingRequiredFields.join(", ")}.`);
      return;
    }
    if (!rutIsValid) {
      setRutTouched(true);
      setError("Ingresa un RUT válido para continuar.");
      return;
    }
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
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    clearIntroTimeouts();

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
      smoking: "",
      alcoholUse: "",
      drugUse: "",
      sexualActivity: "",
      firstDegreeFamilyHistory: "",
      occupation: "",
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

        {(status === "idle" || status === "antecedents") && (
          <>
            <h1 className="mt-6 text-balance text-center text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Escribe tus síntomas acá
            </h1>
            <p className="mx-auto mt-4 max-w-2xl whitespace-pre-line text-balance text-center text-base leading-8 text-slate-600">
              {"Puedes escribir lo que sientes de la forma que quieras.\nUsamos IA para clasificar tus síntomas y guiarte hacia una evaluación clínica precisa."}
            </p>
          </>
        )}

        <section className="mt-2 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.55)] md:p-8">
          {status === "idle" ? (
            <form onSubmit={handleSubmit}>
              <label htmlFor="symptoms-text" className="block text-sm font-semibold text-slate-700">
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
                <span>Tus síntomas, en tus palabras. No necesitas usar términos médicos.</span>
                <span>{symptomsText.trim().length} caracteres</span>
              </div>

              <div className="mt-6 rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">
                  Y rellena tus datos para poder emitir tu receta
                </p>

                <div className="mt-5 grid gap-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Nombre *">
                      <input
                        className={inputCls}
                        value={nameFields.firstName}
                        onChange={(event) =>
                          setNameFields((current) => ({ ...current, firstName: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Apellido paterno *">
                      <input
                        className={inputCls}
                        value={nameFields.paternalSurname}
                        onChange={(event) =>
                          setNameFields((current) => ({
                            ...current,
                            paternalSurname: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Apellido materno *">
                      <input
                        className={inputCls}
                        value={nameFields.maternalSurname}
                        onChange={(event) =>
                          setNameFields((current) => ({
                            ...current,
                            maternalSurname: event.target.value,
                          }))
                        }
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="RUT *">
                      <input
                        ref={rutInputRef}
                        className={showRutInvalid ? errorInputCls : inputCls}
                        value={rut}
                        onChange={(event) => handleRutChange(event.target.value, event.target.selectionStart)}
                        onBlur={() => setRutTouched(true)}
                        inputMode="text"
                        autoComplete="off"
                        placeholder="12.345.678-5"
                      />
                      {showRutInvalid ? <p className="text-xs text-rose-600">RUT inválido.</p> : null}
                    </Field>
                    <Field label="Sexo *">
                      <select
                        className={inputCls}
                        value={sex}
                        onChange={(event) => setSex(event.target.value as SexSelection)}
                      >
                        <option value="">Seleccionar</option>
                        <option value="female">Femenino</option>
                        <option value="male">Masculino</option>
                      </select>
                    </Field>
                    <Field label="Fecha de nacimiento *">
                      <input
                        className={inputCls}
                        type="date"
                        value={birthDate}
                        onChange={(event) => setBirthDate(normalizeBirthDateInput(event.target.value))}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Correo electrónico">
                      <input
                        className={inputCls}
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </Field>
                    <Field label="Teléfono">
                      <input
                        className={inputCls}
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                      />
                    </Field>
                  </div>

                  <Field label="Dirección">
                    <input
                      className={inputCls}
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                    />
                  </Field>
                </div>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Continuar con evaluación
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
                <div
                  ref={antecedentChatViewportRef}
                  className="max-h-[40vh] space-y-3 overflow-y-auto pr-1"
                >
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
                  <div ref={antecedentChatEndRef} />
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
                    ref={antecedentInputRef}
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
                <p className="mt-2">Sexo: {formatSexLabel(sex)}</p>
                <p>Edad: {patientAge > 0 ? `${patientAge} años` : "No reportada"}</p>
                <p>Síntomas del paciente: {symptomsText.trim() || "No reportado"}</p>
                <p className="mt-2 font-semibold text-slate-800">Antecedentes:</p>
                <p>Antecedentes médicos: {antecedentAnswers.medicalHistory || "No reportado"}</p>
                <p>Antecedentes quirúrgicos: {antecedentAnswers.surgicalHistory || "No reportado"}</p>
                <p>Fármacos: {antecedentAnswers.chronicMedication || "No reportado"}</p>
                <p>Alergias: {antecedentAnswers.allergies || "No reportado"}</p>
                <p>Tabaco: {antecedentAnswers.smoking || "No reportado"}</p>
                <p>Alcohol: {antecedentAnswers.alcoholUse || "No reportado"}</p>
                <p>Drogas: {antecedentAnswers.drugUse || "No reportado"}</p>
                <p>Actividad sexual: {antecedentAnswers.sexualActivity || "No reportado"}</p>
                <p>
                  Antecedentes familiares (1er grado):{" "}
                  {antecedentAnswers.firstDegreeFamilyHistory || "No reportado"}
                </p>
                <p>Ocupación: {antecedentAnswers.occupation || "No reportado"}</p>
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Entendimos tu consulta como…
              </h2>
              <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700">
                Para guiar mejor tu evaluación, hemos organizado tu historia de{" "}
                <span className="font-semibold text-slate-900">
                  {result?.interpretation.oneLinerSummary ?? result?.interpretation.probableContext}
                </span>{" "}
                como{" "}
                <span className="font-semibold text-slate-900">
                  {result?.interpretation.probableContext}
                </span>
                .
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <InfoPill label="Síntoma principal" value={result?.interpretation.primarySymptom ?? "-"} />
                <InfoPill
                  label="Síntomas secundarios"
                  value={
                    result?.interpretation.secondarySymptoms?.length
                      ? result.interpretation.secondarySymptoms.join(", ")
                      : "No reportados"
                  }
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

        {status === "idle" ? (
          <>
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
          </>
        ) : null}
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

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
const errorInputCls =
  "w-full rounded-xl border border-rose-400 bg-white px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-200";
