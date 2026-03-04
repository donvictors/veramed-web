import { NextResponse } from "next/server";
import { createChronicControlRecord, serializeChronicControlRecord } from "@/lib/server/chronic-control-store";
import { type PatientDetails } from "@/lib/checkup";
import { type ChronicCondition, type MedicationOption } from "@/lib/chronic-control";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    conditions?: ChronicCondition[];
    patient?: PatientDetails;
    yearsSinceDiagnosis?: number;
    hasRecentChanges?: boolean;
    usesMedication?: boolean;
    selectedMedications?: MedicationOption[];
  };

  if (
    !payload.patient ||
    typeof payload.yearsSinceDiagnosis !== "number" ||
    typeof payload.hasRecentChanges !== "boolean" ||
    typeof payload.usesMedication !== "boolean" ||
    !payload.conditions ||
    !payload.selectedMedications
  ) {
    return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
  }

  const record = await createChronicControlRecord({
    conditions: payload.conditions,
    patient: payload.patient,
    yearsSinceDiagnosis: payload.yearsSinceDiagnosis,
    hasRecentChanges: payload.hasRecentChanges,
    usesMedication: payload.usesMedication,
    selectedMedications: payload.selectedMedications,
  });

  return NextResponse.json({ request: serializeChronicControlRecord(record) }, { status: 201 });
}
