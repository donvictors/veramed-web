import { CLINICAL_FLOW_MAP } from "@/lib/clinical/flows";
import {
  flowAnswersSchema,
  type ClinicalFlowDefinition,
  type ExamRule,
  type FlowAnswers,
  type FlowEvaluationResult,
  type NextStep,
  type RedFlagRule,
} from "@/lib/clinical/types";

type RedFlagEvaluation = {
  matchedRedFlagIds: string[];
  matchedRedFlags: RedFlagRule[];
};

type ExamEvaluation = {
  suggestedExams: string[];
  matchedExamRuleIds: string[];
  clinicianReviewRequired: boolean;
};

function isTruthyAnswer(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["yes", "si", "sí", "true", "1", "y", "on"].includes(normalized);
  }
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

function evaluateConditionSet(
  answers: FlowAnswers,
  options?: {
    whenAll?: string[];
    whenAny?: string[];
    unlessAny?: string[];
  },
) {
  const whenAllOk = (options?.whenAll ?? []).every((questionId) => isTruthyAnswer(answers[questionId]));
  const whenAnyList = options?.whenAny ?? [];
  const whenAnyOk = whenAnyList.length === 0 || whenAnyList.some((questionId) => isTruthyAnswer(answers[questionId]));
  const unlessAnyOk = (options?.unlessAny ?? []).every((questionId) => !isTruthyAnswer(answers[questionId]));
  return whenAllOk && whenAnyOk && unlessAnyOk;
}

function tokenizeExpression(input: string) {
  const tokens: string[] = [];
  let index = 0;
  const source = input.trim();

  while (index < source.length) {
    const current = source[index];

    if (!current) {
      break;
    }

    if (/\s/.test(current)) {
      index += 1;
      continue;
    }

    if ((current === "&" || current === "|") && source[index + 1] === current) {
      tokens.push(current + current);
      index += 2;
      continue;
    }

    if (current === "!" || current === "(" || current === ")") {
      tokens.push(current);
      index += 1;
      continue;
    }

    const idMatch = source.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (idMatch) {
      tokens.push(idMatch[0]);
      index += idMatch[0].length;
      continue;
    }

    throw new Error(`Token inválido en expresión clínica: "${source.slice(index, index + 12)}"`);
  }

  return tokens;
}

function evaluateBooleanExpression(expression: string, answers: FlowAnswers) {
  const tokens = tokenizeExpression(expression);
  let cursor = 0;

  const parseExpression = (): boolean => parseOr();

  const parseOr = (): boolean => {
    let value = parseAnd();
    while (tokens[cursor] === "||") {
      cursor += 1;
      const rhs = parseAnd();
      value = value || rhs;
    }
    return value;
  };

  const parseAnd = (): boolean => {
    let value = parseUnary();
    while (tokens[cursor] === "&&") {
      cursor += 1;
      const rhs = parseUnary();
      value = value && rhs;
    }
    return value;
  };

  const parseUnary = (): boolean => {
    const token = tokens[cursor];

    if (token === "!") {
      cursor += 1;
      return !parseUnary();
    }

    if (token === "(") {
      cursor += 1;
      const value = parseExpression();
      if (tokens[cursor] !== ")") {
        throw new Error("Paréntesis no balanceados en expresión clínica.");
      }
      cursor += 1;
      return value;
    }

    if (token && /^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) {
      cursor += 1;
      return isTruthyAnswer(answers[token]);
    }

    throw new Error(`Expresión clínica inválida cerca de token "${token ?? "EOF"}".`);
  };

  const result = parseExpression();
  if (cursor !== tokens.length) {
    throw new Error("Expresión clínica inválida: tokens sobrantes.");
  }
  return result;
}

function doesRedFlagMatch(redFlag: RedFlagRule, answers: FlowAnswers) {
  if (redFlag.triggerType === "any_yes") {
    return (redFlag.questionIds ?? []).some((questionId) => isTruthyAnswer(answers[questionId]));
  }

  if (redFlag.triggerType === "all_yes") {
    return (redFlag.questionIds ?? []).every((questionId) => isTruthyAnswer(answers[questionId]));
  }

  if (!redFlag.expression) {
    return false;
  }

  return evaluateBooleanExpression(redFlag.expression, answers);
}

function severityRank(severity: "urgent" | "emergency") {
  return severity === "emergency" ? 2 : 1;
}

function pickHighestSeverity(severities: Array<"urgent" | "emergency">): "urgent" | "emergency" | undefined {
  if (severities.length === 0) return undefined;
  return severities.sort((a, b) => severityRank(b) - severityRank(a))[0];
}

function matchExamRule(rule: ExamRule, answers: FlowAnswers) {
  return evaluateConditionSet(answers, {
    whenAll: rule.whenAll,
    whenAny: rule.whenAny,
    unlessAny: rule.unlessAny,
  });
}

export function getClinicalFlow(flowId: string): ClinicalFlowDefinition {
  const flow = CLINICAL_FLOW_MAP.get(flowId);
  if (!flow) {
    throw new Error(`Flow clínico no encontrado: ${flowId}`);
  }
  return flow;
}

export function evaluateRedFlags(flow: ClinicalFlowDefinition, rawAnswers: FlowAnswers): RedFlagEvaluation {
  const answers = flowAnswersSchema.parse(rawAnswers);
  const matchedRedFlags = flow.redFlags.filter((redFlag) => doesRedFlagMatch(redFlag, answers));

  return {
    matchedRedFlagIds: matchedRedFlags.map((redFlag) => redFlag.id),
    matchedRedFlags,
  };
}

export function evaluateHardStop(
  flow: ClinicalFlowDefinition,
  rawAnswers: FlowAnswers,
  redFlagEvaluation?: RedFlagEvaluation,
) {
  const answers = flowAnswersSchema.parse(rawAnswers);
  const redFlags = redFlagEvaluation ?? evaluateRedFlags(flow, answers);
  const hardStopTriggered = flow.hardStopAction.enabled && redFlags.matchedRedFlags.length > 0;
  const redFlagSeverity = pickHighestSeverity(redFlags.matchedRedFlags.map((redFlag) => redFlag.severity));
  const hardStopSeverity = pickHighestSeverity(
    [flow.hardStopAction.severity, ...(redFlagSeverity ? [redFlagSeverity] : [])] as Array<
      "urgent" | "emergency"
    >,
  );

  return {
    hardStopTriggered,
    hardStopSeverity: hardStopTriggered ? hardStopSeverity : undefined,
    matchedRedFlagIds: redFlags.matchedRedFlagIds,
  };
}

export function getSuggestedExams(flow: ClinicalFlowDefinition, rawAnswers: FlowAnswers): ExamEvaluation {
  const answers = flowAnswersSchema.parse(rawAnswers);
  const matchedRules = flow.examRules.filter((rule) => matchExamRule(rule, answers));
  const suggestedExams = new Set<string>();
  let clinicianReviewRequired = false;

  for (const rule of matchedRules) {
    for (const examId of rule.suggestedExams) {
      suggestedExams.add(examId);
    }
    clinicianReviewRequired = clinicianReviewRequired || rule.requiresMedicalReview;
  }

  const dedupedExams = Array.from(suggestedExams);
  const filteredExams =
    dedupedExams.length > 1 ? dedupedExams.filter((examId) => examId !== "no_routine_exams") : dedupedExams;

  return {
    suggestedExams: filteredExams,
    matchedExamRuleIds: matchedRules.map((rule) => rule.id),
    clinicianReviewRequired,
  };
}

function nextStepFromHardStopSeverity(severity: "urgent" | "emergency"): NextStep {
  return severity === "emergency" ? "show_emergency_warning" : "show_urgent_warning";
}

export function evaluateFlow(flowId: string, rawAnswers: FlowAnswers): FlowEvaluationResult {
  const flow = getClinicalFlow(flowId);
  const answers = flowAnswersSchema.parse(rawAnswers);
  const redFlagEvaluation = evaluateRedFlags(flow, answers);
  const hardStop = evaluateHardStop(flow, answers, redFlagEvaluation);

  if (hardStop.hardStopTriggered && hardStop.hardStopSeverity) {
    return {
      flowId,
      triggeredRedFlags: redFlagEvaluation.matchedRedFlagIds,
      hardStopTriggered: true,
      hardStopSeverity: hardStop.hardStopSeverity,
      suggestedExams: [],
      nextStep: nextStepFromHardStopSeverity(hardStop.hardStopSeverity),
      clinicianReviewRequired: true,
      debug: {
        matchedExamRuleIds: [],
        matchedRedFlagIds: redFlagEvaluation.matchedRedFlagIds,
      },
    };
  }

  const examEvaluation = getSuggestedExams(flow, answers);
  const nextStep: NextStep = examEvaluation.clinicianReviewRequired
    ? "clinician_review_before_exams"
    : flow.nextStep;

  return {
    flowId,
    triggeredRedFlags: redFlagEvaluation.matchedRedFlagIds,
    hardStopTriggered: false,
    suggestedExams: examEvaluation.suggestedExams,
    nextStep,
    clinicianReviewRequired: examEvaluation.clinicianReviewRequired,
    debug: {
      matchedExamRuleIds: examEvaluation.matchedExamRuleIds,
      matchedRedFlagIds: redFlagEvaluation.matchedRedFlagIds,
    },
  };
}
