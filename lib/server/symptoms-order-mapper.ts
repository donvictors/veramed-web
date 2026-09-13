import { createVerificationCode } from "@/lib/checkup";
import type { SymptomsOrderDraft } from "@/lib/symptoms-order";
import type { SymptomsRequestRecord } from "@/lib/server/symptoms-store";

export function toSymptomsOrderDraftFromRecord(record: SymptomsRequestRecord): SymptomsOrderDraft {
  const issuedAtMs = record.validatedAt ?? record.updatedAt ?? record.createdAt;
  const tests = record.selectedTests;
  const decision = record.interviewMetadata?.examDecision;
  const patientCareLevel =
    decision?.care_level === "no_tests" && tests.length > 0
      ? "outpatient_tests"
      : decision?.care_level;
  const statusLabel = record.reviewStatus === "validated" ? "Aprobada" : "Pendiente";

  const summary =
    tests.length > 0
      ? `Se identificaron ${tests.length} exámenes para orientar tu consulta por síntomas.`
      : "No se sugieren exámenes de rutina automáticos para este cuadro inicial.";

  return {
    id: record.id,
    careDecision: decision ? {
      care_level: patientCareLevel!,
      patient_guidance:
        decision.care_level === "no_tests" && tests.length > 0
          ? "Estos exámenes quedan sujetos a revisión médica antes de emitir la orden definitiva."
          : decision.patient_guidance,
      status: decision.status,
    } : undefined,
    issuedAtMs,
    verificationCode: createVerificationCode(record.patient.rut, issuedAtMs),
    summary,
    symptomsText: record.symptomsText,
    patient: {
      fullName: record.patient.fullName,
      rut: record.patient.rut,
      birthDate: record.patient.birthDate,
      email: record.patient.email,
      phone: record.patient.phone,
      address: record.patient.address,
    },
    interpretation: record.interpretation,
    antecedents: record.antecedents,
    answers: record.followUpAnswers,
    tests,
    notes: [
      ...(record.notes ?? []),
      record.reviewStatus === "validated"
        ? `Estado de validación: ${statusLabel}.`
        : "Estado de validación: Pendiente de firma médica.",
    ],
    flow: {
      flowId: record.flowId || record.interpretation.flowId || "fatigue_weight_loss_general_symptoms",
      label: record.interpretation.probableContext || "Evaluación por síntomas",
      nextStep: decision?.care_level === "emergency" ? "show_emergency_warning"
        : decision?.care_level === "presencial_priority" ? "show_urgent_warning"
        : record.interpretation.urgencyWarning ? "show_urgent_warning" : "continue_flow",
      clinicianReviewRequired: true,
      triggeredRedFlags: decision?.red_flags ?? record.clinicalState?.redFlags.filter(flag => flag.status === "present").map(flag => flag.label) ?? [],
    },
  };
}
