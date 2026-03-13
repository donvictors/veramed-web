import { getExamById } from "@/lib/clinical/examCatalog";
import { evaluateFlow, getClinicalFlow } from "@/lib/clinical/engine";
import type { ClinicalExam, ClinicalExamCategory } from "@/lib/clinical/examCatalog";
import type { KeyQuestion, NextStep } from "@/lib/clinical/types";
import { createVerificationCode, type PatientDetails, type TestItem } from "@/lib/checkup";
import { getExamMetadataByClinicalExamId } from "@/lib/exam-master-catalog";
import type { SymptomsInterpretation } from "@/lib/symptoms-intake";
import {
  EMPTY_SYMPTOMS_ANTECEDENTS,
  type SymptomsAntecedents,
  type SymptomsFlowAnswerMap,
  type SymptomsOrderDraft,
} from "@/lib/symptoms-order";

const YES_TOKENS = ["si", "sí", "s", "yes", "y", "true", "1"];
const NO_TOKENS = ["no", "n", "false", "0"];

function generateOrderId(timestamp = Date.now()) {
  const now = timestamp.toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 46656)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0");
  return `sym_${now}${rand}`.slice(0, 22);
}

function normalizeFreeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizeBooleanFromText(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (!normalized) return false;
  if (YES_TOKENS.some((token) => normalized === token || normalized.startsWith(`${token} `))) {
    return true;
  }
  if (NO_TOKENS.some((token) => normalized === token || normalized.startsWith(`${token} `))) {
    return false;
  }
  return false;
}

function normalizeToEngineAnswer(question: KeyQuestion, rawAnswer: string): unknown {
  if (!rawAnswer) {
    return false;
  }

  if (question.type === "boolean") {
    return normalizeBooleanFromText(rawAnswer);
  }

  if (question.type === "number") {
    const parsed = Number(rawAnswer.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : false;
  }

  if (question.type === "multi_select") {
    return rawAnswer
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (question.type === "single_select") {
    return true;
  }

  if (question.type === "duration") {
    return true;
  }

  return true;
}

function findExamDisplayName(exam: ClinicalExam) {
  const mapped = getExamMetadataByClinicalExamId(exam.id);
  return mapped?.name ?? exam.label;
}

function reasonFromRule(ruleDescription: string, ruleRationale?: string) {
  return ruleRationale?.trim() || ruleDescription.trim();
}

function mergeTestReason(target: Map<string, TestItem>, testName: string, reason: string) {
  const existing = target.get(testName);
  if (!existing) {
    target.set(testName, { name: testName, why: reason });
    return;
  }
  if (!existing.why.includes(reason)) {
    existing.why = `${existing.why} ${reason}`;
  }
}

function hasMarkerOnly(exams: string[]) {
  return exams.length === 1 && exams[0] === "no_routine_exams";
}

export type BuildSymptomsOrderInput = {
  symptomsText: string;
  patient: PatientDetails;
  interpretation: SymptomsInterpretation;
  antecedents?: Partial<SymptomsAntecedents>;
  answers: SymptomsFlowAnswerMap;
  createdAtMs?: number;
};

export type BuildSymptomsOrderOutput = {
  order: SymptomsOrderDraft;
  engineAnswers: Record<string, unknown>;
  nextStep: NextStep;
  hardStopTriggered: boolean;
};

export function buildSymptomsOrderFromEngine(input: BuildSymptomsOrderInput): BuildSymptomsOrderOutput {
  const flowId = (input.interpretation.flowId ?? "").trim();
  if (!flowId) {
    throw new Error("No se encontró flowId en la interpretación clínica.");
  }

  const flow = getClinicalFlow(flowId);
  const patientName = input.patient.fullName?.trim() ?? "";
  const patientRut = input.patient.rut?.trim() ?? "";
  const patientBirthDate = input.patient.birthDate?.trim() ?? "";
  if (!patientName || !patientRut || !patientBirthDate) {
    throw new Error("Faltan datos obligatorios del paciente para emitir la orden.");
  }

  const normalizedAnswers = flow.keyQuestions.reduce<Record<string, unknown>>((acc, question) => {
    const raw = normalizeFreeText(input.answers[question.id]);
    acc[question.id] = normalizeToEngineAnswer(question, raw);
    return acc;
  }, {});

  const evaluation = evaluateFlow(flowId, normalizedAnswers);

  const testMap = new Map<string, TestItem>();
  const matchedRuleIds = new Set(evaluation.debug?.matchedExamRuleIds ?? []);
  for (const rule of flow.examRules) {
    if (!matchedRuleIds.has(rule.id)) {
      continue;
    }

    const reason = reasonFromRule(rule.description, rule.rationale);
    for (const examId of rule.suggestedExams) {
      if (examId === "no_routine_exams") {
        continue;
      }
      const exam = getExamById(examId);
      if (!exam) {
        continue;
      }
      mergeTestReason(testMap, findExamDisplayName(exam), reason);
    }
  }

  if (testMap.size === 0) {
    for (const examId of evaluation.suggestedExams) {
      if (examId === "no_routine_exams") continue;
      const exam = getExamById(examId);
      if (!exam) continue;
      mergeTestReason(
        testMap,
        findExamDisplayName(exam),
        exam.shortDescription || `Sugerido por flujo clínico ${flow.label}.`,
      );
    }
  }

  const tests = Array.from(testMap.values());
  const issuedAtMs = input.createdAtMs ?? Date.now();
  const noRoutine = hasMarkerOnly(evaluation.suggestedExams);
  const notes: string[] = [];

  if (evaluation.hardStopTriggered) {
    if (evaluation.hardStopSeverity === "emergency") {
      notes.push(
        "Se detectaron señales de alerta de alta prioridad. Te recomendamos evaluación médica presencial inmediata.",
      );
    } else {
      notes.push(
        "Se detectaron señales de alerta que requieren evaluación médica presencial prioritaria.",
      );
    }
  }

  if (evaluation.clinicianReviewRequired) {
    notes.push("La sugerencia de exámenes queda sujeta a revisión médica antes de la emisión final.");
  }

  if (noRoutine || tests.length === 0) {
    notes.push("En este escenario no se sugieren exámenes de rutina de forma automática.");
  } else {
    notes.push("Orden sugerida a partir de relato libre de síntomas y reglas clínicas deterministas.");
  }

  const summary =
    tests.length > 0
      ? `Se identificaron ${tests.length} exámenes sugeridos para orientar tu consulta por síntomas.`
      : "No se sugieren exámenes de rutina automáticos para este cuadro inicial.";

  return {
    order: {
      id: generateOrderId(issuedAtMs),
      issuedAtMs,
      verificationCode: createVerificationCode(input.patient.rut, issuedAtMs),
      summary,
      symptomsText: input.symptomsText.trim(),
      patient: input.patient,
      interpretation: input.interpretation,
      antecedents: {
        ...EMPTY_SYMPTOMS_ANTECEDENTS,
        ...(input.antecedents ?? {}),
      },
      answers: input.answers,
      tests,
      notes,
      flow: {
        flowId,
        label: flow.label,
        nextStep: evaluation.nextStep,
        clinicianReviewRequired: evaluation.clinicianReviewRequired,
        triggeredRedFlags: evaluation.triggeredRedFlags,
      },
    },
    engineAnswers: normalizedAnswers,
    nextStep: evaluation.nextStep,
    hardStopTriggered: false,
  };
}

export function getExamCategoryById(examId: string): ClinicalExamCategory | null {
  const exam = getExamById(examId);
  return exam?.category ?? null;
}
