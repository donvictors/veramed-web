export const PRESCRIPTION_RENEWAL_PROTOCOL_VERSION = "prescription-renewal-2026-09-19.v1";
export const PRESCRIPTION_RENEWAL_PRICE_CLP = 4990;
export const TELEMEDICINE_PRICE_CLP = 19990;

export type RenewableMedication = {
  id: string;
  genericName: string;
  displayName: string;
  renewable: boolean;
  requiresManualReview: boolean;
  excluded: boolean;
  exclusionReason: string | null;
  protocolVersion: string;
};

const allowed = [
  ["losartan", "Losartán"],
  ["enalapril", "Enalapril"],
  ["amlodipino", "Amlodipino"],
  ["atorvastatina", "Atorvastatina"],
  ["levotiroxina", "Levotiroxina"],
  ["metformina", "Metformina"],
] as const;

export const renewableMedications: RenewableMedication[] = allowed.map(([id, name]) => ({
  id,
  genericName: name,
  displayName: name,
  renewable: true,
  requiresManualReview: false,
  excluded: false,
  exclusionReason: null,
  protocolVersion: PRESCRIPTION_RENEWAL_PROTOCOL_VERSION,
}));

export type RenewalInput = {
  medicationId: string;
  sameDose: boolean;
  importantAdverseEffects: boolean;
  importantHealthChanges: boolean;
  missingInformation?: boolean;
};

export type RenewalEligibility = "eligible_for_renewal" | "manual_review" | "not_eligible";

export function evaluatePrescriptionRenewal(input: RenewalInput): RenewalEligibility {
  const medication = renewableMedications.find((item) => item.id === input.medicationId);
  if (!medication || medication.excluded || !medication.renewable) return "not_eligible";
  if (medication.requiresManualReview || !input.sameDose || input.importantAdverseEffects || input.importantHealthChanges || input.missingInformation) {
    return "manual_review";
  }
  return "eligible_for_renewal";
}
