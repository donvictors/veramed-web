import "server-only";

import type { SymptomsInterpretation } from "@/lib/symptoms-intake";
import type {
  InterviewQuestionCandidate,
  SymptomsClinicalState,
} from "@/lib/server/symptoms-clinical-state";
import {
  buildFallbackQueue,
  createInitialClinicalPlan,
} from "@/lib/server/symptoms-interview-engine.mjs";

export { ADAPTIVE_INTERVIEW_VERSION } from "@/lib/server/symptoms-clinical-state";
export const MIN_INTERVIEW_TURNS = 0;
export const LEGACY_MIN_INTERVIEW_TURNS = 4;
export const MAX_INTERVIEW_TURNS = 8;

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
  {
    pattern:
      /dolor (?:de |en (?:un |el )?)?(?:test[ií]culo|testicular|escroto).{0,70}(?:s[uú]bit|repentin|de golpe|intens|muy fuerte|insoportable)|(?:s[uú]bit|repentin|de golpe|intens|muy fuerte|insoportable).{0,70}(?:test[ií]culo|testicular|escroto)/i,
    reason: "Dolor testicular súbito o intenso declarado durante la entrevista.",
  },
  {
    pattern: /(?:pensado|pienso|ganas de) (?:en )?(?:hacerme da[ñn]o|suicid|morir)|no puedo mantenerme a salvo/i,
    reason: "Riesgo para la seguridad personal declarado durante la entrevista.",
  },
];

const ADVICE_PATTERN =
  /\b(?:diagn[oó]stic|tratamiento|receta|medicamento|debes tomar|toma este|suspende|probablemente tienes|parece que tienes)\b/i;

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

export function sanitizeInterviewAcknowledgement(value: string) {
  const clean = value.trim();
  if (!clean || clean.length > 180 || ADVICE_PATTERN.test(clean)) return "";
  if (/^(?:gracias|entiendo|perfecto|de acuerdo|registr[eé])/i.test(clean)) return "";
  return clean;
}

export function createFallbackClinicalPlan(input: {
  interpretation: SymptomsInterpretation;
  symptomsText: string;
  sex?: "female" | "male" | "";
}) {
  return createInitialClinicalPlan({
    flowId: input.interpretation.flowId || "fatigue_weight_loss_general_symptoms",
    summary: input.interpretation.oneLinerSummary,
    primarySymptom: input.interpretation.primarySymptom,
    symptomsText: input.symptomsText,
    sex: input.sex ?? "",
  }) as {
    clinicalState: SymptomsClinicalState;
    queue: InterviewQuestionCandidate[];
  };
}

export function refillFallbackQuestionQueue(input: {
  flowId: string;
  clinicalState: SymptomsClinicalState;
  existingQueue?: InterviewQuestionCandidate[];
  askedQuestions: string[];
  sex?: "female" | "male" | "";
  symptomsText?: string;
}) {
  return buildFallbackQueue({
    flowId: input.flowId,
    state: input.clinicalState,
    existingQueue: input.existingQueue ?? [],
    askedQuestions: input.askedQuestions,
    sex: input.sex ?? "",
    symptomsText: input.symptomsText ?? "",
  }) as InterviewQuestionCandidate[];
}
