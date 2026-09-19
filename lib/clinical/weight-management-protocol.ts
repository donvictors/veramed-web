export const WEIGHT_MANAGEMENT_PROTOCOL_VERSION = "weight-management-2026-09-19.v1";
export const WEIGHT_MANAGEMENT_PRICE_CLP = 7990;

export const weightComorbidities = [
  "hypertension",
  "dyslipidemia",
  "prediabetes",
  "type2_diabetes",
  "sleep_apnea",
  "cardiovascular_disease",
] as const;
export type WeightComorbidity = (typeof weightComorbidities)[number];

export type WeightSafetyAnswers = {
  pregnant: boolean;
  breastfeeding: boolean;
  planningPregnancy: boolean;
  medullaryThyroidCancerOrMen2: boolean;
  semaglutideHypersensitivity: boolean;
  pancreatitis: boolean;
  relevantBiliaryDisease: boolean;
  severeGastroparesisSymptoms: boolean;
  relevantKidneyDisease: boolean;
  usingOtherGlp1OrTirzepatide: boolean;
  usingInsulinOrSulfonylurea: boolean;
  bariatricSurgery: boolean;
};

export type WeightOutcome = "standard_path" | "medical_review_required" | "contraindicated_for_simplified_path" | "no_simplified_indication";

export function calculateBmi(weightKg: number, heightCm: number) {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || weightKg <= 0 || heightCm <= 0) return 0;
  return Math.round((weightKg / ((heightCm / 100) ** 2)) * 10) / 10;
}

export function evaluateWeightManagement(input: {
  age: number;
  bmi: number;
  comorbidities: WeightComorbidity[];
  safety: WeightSafetyAnswers;
}): WeightOutcome {
  const s = input.safety;
  if (s.pregnant || s.breastfeeding || s.planningPregnancy || s.medullaryThyroidCancerOrMen2 || s.semaglutideHypersensitivity) {
    return "contraindicated_for_simplified_path";
  }
  const hasFormalIndication = input.bmi >= 30 || (input.bmi >= 27 && input.bmi < 30 && input.comorbidities.length > 0);
  if (!hasFormalIndication) return "no_simplified_indication";
  if (input.age < 18 || s.pancreatitis || s.relevantBiliaryDisease || s.severeGastroparesisSymptoms || s.relevantKidneyDisease || s.usingOtherGlp1OrTirzepatide || s.usingInsulinOrSulfonylurea || s.bariatricSurgery) {
    return "medical_review_required";
  }
  return "standard_path";
}

export const weightFollowUpProtocol = {
  protocolVersion: WEIGHT_MANAGEMENT_PROTOCOL_VERSION,
  weeks: [4, 8, 12],
  titration: "PENDIENTE_DE_VALIDACION_MEDICA",
} as const;

export function evaluateWeightFollowUp(input: { vomiting: boolean; abdominalPain: boolean; newSymptoms: boolean; medicationChanges: boolean }) {
  return input.vomiting || input.abdominalPain || input.newSymptoms || input.medicationChanges ? "physician_review" : "continue";
}
