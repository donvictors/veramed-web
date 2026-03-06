import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { createChronicControlRecord, serializeChronicControlRecord } from "@/lib/server/chronic-control-store";
import { getUserFromSession, syncUserProfileFromPatient } from "@/lib/server/auth-store";
import { type CheckupInput, type PatientDetails } from "@/lib/checkup";
import { type AntiepilepticOption, type ChronicCondition, type MedicationOption } from "@/lib/chronic-control";

function mergePatientDefaults(patient: PatientDetails, profile?: PatientDetails): PatientDetails {
  if (!profile) {
    return patient;
  }

  return {
    fullName: patient.fullName.trim() || profile.fullName,
    rut: patient.rut.trim() || profile.rut,
    birthDate: patient.birthDate || profile.birthDate,
    email: patient.email.trim() || profile.email,
    phone: patient.phone.trim() || profile.phone,
    address: patient.address.trim() || profile.address,
  };
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      conditions?: ChronicCondition[];
      patient?: PatientDetails;
      yearsSinceDiagnosis?: number;
      hasRecentChanges?: boolean;
      usesMedication?: boolean;
      selectedMedications?: MedicationOption[];
      selectedAntiepileptics?: AntiepilepticOption[];
      generalCheckupInput?: CheckupInput;
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

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    const user = await getUserFromSession(token);
    const patient = mergePatientDefaults(payload.patient, user?.profile);

    const record = await createChronicControlRecord({
      userId: user?.id,
      conditions: payload.conditions,
      patient,
      yearsSinceDiagnosis: payload.yearsSinceDiagnosis,
      hasRecentChanges: payload.hasRecentChanges,
      usesMedication: payload.usesMedication,
      selectedMedications: payload.selectedMedications,
      selectedAntiepileptics: payload.selectedAntiepileptics ?? [],
      generalCheckupInput: payload.generalCheckupInput,
    });

    if (user?.id) {
      await syncUserProfileFromPatient(user.id, patient);
    }

    return NextResponse.json({ request: serializeChronicControlRecord(record) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/chronic-controls failed", error);
    return NextResponse.json(
      { error: "No pudimos crear tu solicitud de control crónico." },
      { status: 500 },
    );
  }
}
