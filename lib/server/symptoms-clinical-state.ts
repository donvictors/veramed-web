import "server-only";

import { z } from "zod";
import { savedExamDecisionSchema } from "@/lib/symptoms-exam-assessment";

export const CLINICAL_STATE_VERSION = "clinical-state-v2";
export const ADAPTIVE_INTERVIEW_VERSION = "adaptive-interview-v2";

export const clinicalFactSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(240),
  value: z.string().min(1).max(2_000),
  status: z.enum(["reported", "denied", "uncertain"]),
  source: z.enum(["initial", "answer", "deterministic", "model"]),
  turn: z.number().int().min(0).max(8),
});

export const activeSyndromeSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(180),
  likelihood: z.enum(["primary", "secondary", "possible"]),
  basis: z.array(z.string().min(1).max(300)).max(6),
});

export const clinicalRedFlagSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(240),
  status: z.enum(["present", "absent", "uncertain"]),
  priority: z.enum(["critical", "high", "moderate"]),
  source: z.enum(["deterministic", "model"]),
});

export const pendingClinicalDomainSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(180),
  priority: z.number().int().min(1).max(5),
  clinicalImpact: z.string().min(1).max(300),
  impactAreas: z.array(z.enum(["urgency", "differential", "testing"])).min(1).max(3),
});

export const symptomsClinicalStateSchema = z.object({
  version: z.literal(CLINICAL_STATE_VERSION),
  facts: z.array(clinicalFactSchema).max(40),
  activeSyndromes: z.array(activeSyndromeSchema).max(8),
  redFlags: z.array(clinicalRedFlagSchema).max(12),
  pendingDomains: z.array(pendingClinicalDomainSchema).max(12),
  updatedSummary: z.string().min(5).max(600),
  readyToComplete: z.boolean(),
});

export const interviewQuestionCandidateSchema = z.object({
  id: z.string().min(1).max(100),
  question: z.string().min(6).max(240),
  quickReplies: z.array(z.string().min(1).max(80)).max(4),
  targetDomain: z.string().min(1).max(100),
  priority: z.number().int().min(1).max(5),
  clinicalImpact: z.string().min(1).max(300),
  impactAreas: z.array(z.enum(["urgency", "differential", "testing"])).min(1).max(3),
  sensitive: z.boolean(),
  origin: z.enum(["llm", "fallback"]),
});

export const queueInvalidationEventSchema = z.object({
  turn: z.number().int().min(0).max(8),
  reason: z.string().min(1).max(300),
  at: z.string().datetime(),
});

export const interviewQuestionTraceSchema = z.object({
  turn: z.number().int().min(1).max(8),
  questionId: z.string().min(1).max(100),
  question: z.string().min(6).max(240),
  targetDomain: z.string().min(1).max(100),
  origin: z.enum(["llm", "fallback"]),
  answeredAt: z.string().datetime(),
});

export const interviewMetadataSchema = z.object({
  examDecision: savedExamDecisionSchema.optional(),
  version: z.literal(ADAPTIVE_INTERVIEW_VERSION),
  turns: z.number().int().min(0).max(8),
  lastOrigin: z.enum(["llm", "fallback", "fast-path", "initial"]),
  lastModel: z.string().max(100),
  queueInvalidations: z.number().int().min(0).max(30),
  invalidationEvents: z.array(queueInvalidationEventSchema).max(20),
  questionHistory: z.array(interviewQuestionTraceSchema).max(8).default([]),
  currentQuestion: interviewQuestionCandidateSchema.nullable(),
  stopReason: z.enum([
    "not_stopped",
    "clinical_state_ready",
    "no_high_yield_domains",
    "maximum_turns",
    "fallback_exhausted",
  ]),
  warningActive: z.boolean(),
});

export type SymptomsClinicalState = z.infer<typeof symptomsClinicalStateSchema>;
export type InterviewQuestionCandidate = z.infer<typeof interviewQuestionCandidateSchema>;
export type SymptomsInterviewMetadata = z.infer<typeof interviewMetadataSchema>;

export function parseClinicalState(value: unknown): SymptomsClinicalState | null {
  const parsed = symptomsClinicalStateSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseQuestionQueue(value: unknown): InterviewQuestionCandidate[] {
  const parsed = z.array(interviewQuestionCandidateSchema).max(3).safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function parseInterviewMetadata(value: unknown): SymptomsInterviewMetadata | null {
  const parsed = interviewMetadataSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function createInitialInterviewMetadata(input: {
  currentQuestion: InterviewQuestionCandidate | null;
  origin: "llm" | "fallback";
  model?: string;
  warningActive: boolean;
}): SymptomsInterviewMetadata {
  return {
    version: ADAPTIVE_INTERVIEW_VERSION,
    turns: 0,
    lastOrigin: "initial",
    lastModel: input.model ?? input.origin,
    queueInvalidations: 0,
    invalidationEvents: [],
    questionHistory: [],
    currentQuestion: input.currentQuestion,
    stopReason: "not_stopped",
    warningActive: input.warningActive,
  };
}
