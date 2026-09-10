import type {
  InterviewQuestionCandidate,
  SymptomsClinicalState,
} from "./symptoms-clinical-state";

export const SYMPTOMS_FLOW_IDS: readonly string[];
export const INTERVIEW_QUEUE_LIMIT: number;

export function getClinicalMap(
  flowId: string,
  context?: { sex?: string; sexualContext?: boolean; symptomsText?: string },
): {
  flowId: string;
  domains: Array<{
    id: string;
    label: string;
    priority: number;
    clinicalImpact: string;
    impactAreas: Array<"urgency" | "differential" | "testing">;
    question: string;
    quickReplies: string[];
    coverageTerms: string[];
    sensitive?: boolean;
  }>;
};

export function createQuestionCandidate(
  domain: Record<string, unknown>,
  origin?: "llm" | "fallback",
): InterviewQuestionCandidate;

export function createInitialClinicalPlan(input: {
  flowId: string;
  summary: string;
  primarySymptom: string;
  symptomsText: string;
  sex?: string;
}): { clinicalState: SymptomsClinicalState; queue: InterviewQuestionCandidate[] };

export function detectMaterialPivot(text: string): {
  id: string;
  flowId: string;
  reason: string;
  urgent: boolean;
} | null;

export function reconcileQuestionQueue(input: {
  state: SymptomsClinicalState;
  queue: InterviewQuestionCandidate[];
  currentQuestion: InterviewQuestionCandidate | null;
  answer: string;
  askedQuestions: string[];
  turnNumber: number;
}): {
  state: SymptomsClinicalState;
  queue: InterviewQuestionCandidate[];
  invalidated: boolean;
  invalidationReason: string;
  pivot: ReturnType<typeof detectMaterialPivot>;
  resolvedDomains: string[];
};

export function buildFallbackQueue(input: {
  flowId: string;
  state: SymptomsClinicalState;
  existingQueue?: InterviewQuestionCandidate[];
  askedQuestions?: string[];
  sex?: string;
  symptomsText?: string;
}): InterviewQuestionCandidate[];

export function shouldCompleteAdaptiveInterview(input: {
  completedTurns: number;
  state: Pick<SymptomsClinicalState, "readyToComplete" | "pendingDomains">;
  queue: InterviewQuestionCandidate[];
}): { complete: boolean; reason: string };

export function isQuestionSafeAndNovel(
  candidate: Partial<InterviewQuestionCandidate> & { question: string },
  askedQuestions?: string[],
): boolean;

export function mergeCandidateQueues(input: {
  retained?: InterviewQuestionCandidate[];
  generated?: InterviewQuestionCandidate[];
  askedQuestions?: string[];
}): InterviewQuestionCandidate[];

export function filterQuestionCandidatesForContext(
  candidates: InterviewQuestionCandidate[],
  context?: { sex?: string; flowId?: string },
): InterviewQuestionCandidate[];

export function filterCandidatesForClinicalState(
  candidates: InterviewQuestionCandidate[],
  state: SymptomsClinicalState,
): InterviewQuestionCandidate[];

export function ensureAnorectalDiscriminators(input: {
  state: SymptomsClinicalState;
  queue: InterviewQuestionCandidate[];
  symptomsText: string;
  answeredDomains?: string[];
  answeredQuestions?: string[];
  completedTurns: number;
}): { state: SymptomsClinicalState; queue: InterviewQuestionCandidate[] };
