import type { NextStep } from "@/lib/clinical/types";
import type { PatientDetails, TestItem } from "@/lib/checkup";
import type { SymptomsInterpretation } from "@/lib/symptoms-intake";

export type SymptomsAntecedents = {
  medicalHistory: string;
  surgicalHistory: string;
  chronicMedication: string;
  allergies: string;
  smoking: string;
  alcoholUse: string;
  drugUse: string;
  sexualActivity: string;
  firstDegreeFamilyHistory: string;
  occupation: string;
};

export const EMPTY_SYMPTOMS_ANTECEDENTS: SymptomsAntecedents = {
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
};

export type SymptomsFlowAnswerMap = Record<string, string>;

export type SymptomsOrderFlowSummary = {
  flowId: string;
  label: string;
  nextStep: NextStep;
  clinicianReviewRequired: boolean;
  triggeredRedFlags: string[];
};

export type SymptomsOrderDraft = {
  id: string;
  issuedAtMs: number;
  verificationCode: string;
  summary: string;
  symptomsText: string;
  patient: PatientDetails;
  interpretation: SymptomsInterpretation;
  antecedents: SymptomsAntecedents;
  answers: SymptomsFlowAnswerMap;
  tests: TestItem[];
  notes: string[];
  flow: SymptomsOrderFlowSummary;
};

export type StoredSymptomsIntakeDraft = {
  input: string;
  patient?: PatientDetails;
  antecedents: SymptomsAntecedents;
  output: SymptomsInterpretation;
  engineVersion: string;
  createdAt: string;
};
