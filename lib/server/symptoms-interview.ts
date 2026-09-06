import "server-only";

import type { SymptomsInterpretation } from "@/lib/symptoms-intake";

export const ADAPTIVE_INTERVIEW_VERSION = "adaptive-interview-v1";
export const MIN_INTERVIEW_TURNS = 4;
export const MAX_INTERVIEW_TURNS = 8;

const UNIVERSAL_FALLBACK_QUESTIONS = [
  "¿Desde cuándo comenzaron los síntomas y cómo han evolucionado?",
  "¿Qué intensidad tienen ahora y cuánto interfieren con tus actividades habituales?",
  "¿Qué otros síntomas aparecieron al mismo tiempo?",
  "¿Hay algo que los alivie, los empeore o los desencadene?",
  "¿Has presentado fiebre, desmayo, sangrado, dolor intenso o dificultad para respirar?",
  "¿Habías tenido un episodio similar anteriormente?",
  "¿Hay algún antecedente o detalle importante que todavía no hayamos preguntado?",
];

const URGENCY_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /(?:no puedo|no logra|me cuesta mucho)\s+respirar|falta de aire (?:intensa|severa|en reposo)/i,
    reason: "Dificultad respiratoria relevante declarada durante la entrevista.",
  },
  {
    pattern: /dolor (?:muy )?(?:fuerte|intenso|opresivo) (?:en el )?pecho|presi[oó]n (?:fuerte )?(?:en el )?pecho/i,
    reason: "Dolor o presión torácica intensa declarada durante la entrevista.",
  },
  {
    pattern: /desmay|p[eé]rdida de (?:la )?conciencia|convul/i,
    reason: "Pérdida de conciencia o convulsión declarada durante la entrevista.",
  },
  {
    pattern: /debilidad (?:de|en) un lado|no puedo mover|dificultad (?:repentina )?para hablar|cara desviada/i,
    reason: "Síntomas neurológicos súbitos declarados durante la entrevista.",
  },
  {
    pattern: /sangrado (?:muy )?(?:abundante|activo)|vomit(?:o|ó|é) sangre|heces negras/i,
    reason: "Sangrado relevante declarado durante la entrevista.",
  },
  {
    pattern: /confusi[oó]n (?:repentina|s[uú]bita)|peor dolor de cabeza|rigidez de cuello/i,
    reason: "Síntomas de alarma neurológica declarados durante la entrevista.",
  },
];

const IDENTIFIER_REQUEST_PATTERN = /\b(?:nombre|rut|correo|e-?mail|tel[eé]fono|direcci[oó]n)\b/i;
const ADVICE_PATTERN =
  /\b(?:diagn[oó]stic|tratamiento|receta|medicamento|debes tomar|toma este|suspende|probablemente tienes|parece que tienes)\b/i;

function normalizeQuestion(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findDeterministicUrgency(texts: string[]) {
  for (const text of texts) {
    for (const { pattern, reason } of URGENCY_PATTERNS) {
      const match = text.match(pattern);
      if (!match || typeof match.index !== "number") continue;
      const precedingText = text.slice(Math.max(0, match.index - 55), match.index);
      const isNegated = /\b(?:no|sin|niego|niega|nunca|tampoco)\b[^.!?\n]{0,45}$/i.test(
        precedingText,
      );
      if (!isNegated) return reason;
    }
  }
  return "";
}

export function pickFallbackInterviewQuestion(input: {
  interpretation: SymptomsInterpretation;
  askedQuestions: string[];
}) {
  const asked = new Set(input.askedQuestions.map(normalizeQuestion));
  const candidates = [
    ...input.interpretation.followUpQuestions,
    ...UNIVERSAL_FALLBACK_QUESTIONS,
  ];

  return candidates.find((question) => {
    const normalized = normalizeQuestion(question);
    return normalized.length > 0 && !asked.has(normalized);
  }) ?? "";
}

export function isSafeAdaptiveQuestion(question: string) {
  const clean = question.trim();
  return (
    clean.length >= 6 &&
    clean.length <= 240 &&
    clean.endsWith("?") &&
    !IDENTIFIER_REQUEST_PATTERN.test(clean) &&
    !ADVICE_PATTERN.test(clean)
  );
}

export function sanitizeInterviewAcknowledgement(value: string) {
  const clean = value.trim();
  if (!clean || clean.length > 180 || ADVICE_PATTERN.test(clean)) {
    return "Gracias, registré esa información.";
  }
  return clean;
}

export function shouldCompleteInterview(input: {
  completedTurns: number;
  modelReady: boolean;
  hasNextQuestion: boolean;
}) {
  if (input.completedTurns >= MAX_INTERVIEW_TURNS) return true;
  if (input.completedTurns < MIN_INTERVIEW_TURNS) return false;
  return input.modelReady || !input.hasNextQuestion;
}
