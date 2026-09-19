export const KINESIOLOGY_PROTOCOL_VERSION = "kinesiology-2026-09-19.v1";
export const KINESIOLOGY_PRICE_CLP = 3990;

export type KinesiologyExtraction = {
  diagnosis: string | null;
  anatomicalRegion: string | null;
  laterality: "left" | "right" | "bilateral" | "not_applicable" | null;
  documentDate: string | null;
  providerName: string | null;
  providerInstitution: string | null;
  surgeryOrProcedure: string | null;
  rehabExplicitlyIndicated: boolean | null;
  redFlagTextFound: string[];
  extractionConfidence: number;
};

export type KinesiologyEligibility =
  | "eligible"
  | "manual_review"
  | "not_eligible"
  | "insufficient_documentation";

// Deliberadamente acotada. Toda ampliación requiere revisión y una nueva versión clínica.
export const kinesiologyEligibilityRules = {
  protocolVersion: KINESIOLOGY_PROTOCOL_VERSION,
  minimumExtractionConfidence: 0.65,
  eligibleDiagnosisTerms: [
    "artrosis",
    "tendinopat",
    "esguince",
    "lumbalgia mecánica",
    "lumbalgia mecanica",
    "cervicalgia mecánica",
    "cervicalgia mecanica",
    "rehabilitación musculoesquelética",
    "rehabilitacion musculoesqueletica",
  ],
  acuteOrUncertainTerms: ["fractura aguda", "diagnóstico incierto", "diagnostico incierto", "manejo agudo"],
  sessions: null as number | null,
} as const;

export function evaluateKinesiologyEligibility(
  extraction: KinesiologyExtraction,
): KinesiologyEligibility {
  if (!extraction.diagnosis || extraction.extractionConfidence < kinesiologyEligibilityRules.minimumExtractionConfidence) {
    return "insufficient_documentation";
  }
  if (extraction.redFlagTextFound.length > 0) return "manual_review";
  const normalized = `${extraction.diagnosis} ${extraction.surgeryOrProcedure ?? ""}`.toLocaleLowerCase("es-CL");
  if (kinesiologyEligibilityRules.acuteOrUncertainTerms.some((term) => normalized.includes(term))) {
    return "manual_review";
  }
  if (extraction.rehabExplicitlyIndicated === true || kinesiologyEligibilityRules.eligibleDiagnosisTerms.some((term) => normalized.includes(term))) {
    return "eligible";
  }
  return "manual_review";
}
