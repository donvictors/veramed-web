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

export const DEFAULT_SYMPTOMS_TESTS: TestItem[] = [
  {
    name: "Hemograma",
    why: "Examen de respaldo sugerido para la revisión médica de la consulta por síntomas.",
  },
  {
    name: "Creatinina en sangre",
    why: "Examen de respaldo sugerido para evaluar la función renal durante la revisión médica.",
  },
  {
    name: "Proteína C reactiva (PCR)",
    why: "Examen de respaldo sugerido para evaluar actividad inflamatoria durante la revisión médica.",
  },
  {
    name: "Perfil bioquímico",
    why: "Examen de respaldo sugerido para complementar la revisión médica de la consulta.",
  },
];

export function ensureSymptomsTests(tests: TestItem[]): TestItem[] {
  return tests.length > 0 ? tests : DEFAULT_SYMPTOMS_TESTS.map((test) => ({ ...test }));
}

export type SymptomsOrderFlowSummary = {
  flowId: string;
  label: string;
  nextStep: NextStep;
  clinicianReviewRequired: boolean;
  triggeredRedFlags: string[];
};

export type SymptomsOrderDraft = {
  careDecision?: { care_level: import("@/lib/symptoms-exam-assessment").CareLevel; patient_guidance: string; status: "audited" | "review_required" };
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
  reviewStatus?: "draft" | "paid" | "in_flow" | "pending_validation" | "validated" | "rejected";
  validatedByEmail?: string;
  validatedAt?: number;
  signedPdfLinks?: Array<{
    category: "laboratory" | "image" | "procedure" | "interconsultation";
    url: string;
    fileName: string;
    expiresAt?: number;
  }>;
};

export const SYMPTOMS_PRICE_CLP = 5990;

export type StoredSymptomsIntakeDraft = {
  requestId: string;
  input: string;
  patient?: PatientDetails;
  patientSex?: "female" | "male" | "";
  antecedents: SymptomsAntecedents;
  output: SymptomsInterpretation;
  engineVersion: string;
  aiConsentVersion: string;
  aiConsentAt: string;
  createdAt: string;
};
