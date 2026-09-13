import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { createChronicControlRecord, serializeChronicControlRecord } from "@/lib/server/chronic-control-store";
import { getUserFromSession, syncUserProfileFromPatient } from "@/lib/server/auth-store";
import { type PatientDetails } from "@/lib/checkup";
import {
  getRequestAccessCookieName,
  upsertRequestAccessCookie,
} from "@/lib/server/request-access";
import {
  enforceRateLimit,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";
import { createChronicControlSchema } from "@/lib/server/request-schemas";

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
    requireSameOrigin(request);
    await enforceRateLimit({
      request,
      action: "chronic-control:create",
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    const parsed = createChronicControlSchema.safeParse(await readJsonBody(request, 32_000));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de control crónico inválidos.", details: parsed.error.issues },
        { status: 400 },
      );
    }
    const payload = parsed.data;

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    const user = await getUserFromSession(token);
    const patient = mergePatientDefaults(payload.patient, user?.profile);

    if (user?.id) {
      await syncUserProfileFromPatient(user.id, patient, payload.generalCheckupInput?.sex);
    }

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

    if (!user?.id) {
      const currentAccessCookie = cookieStore.get(getRequestAccessCookieName())?.value;
      const nextAccessCookie = upsertRequestAccessCookie(currentAccessCookie, {
        requestType: "chronic_control",
        requestId: record.id,
        createdAtMs: record.createdAt,
      });

      cookieStore.set(getRequestAccessCookieName(), nextAccessCookie, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return NextResponse.json({ request: serializeChronicControlRecord(record) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/chronic-controls failed", error);
    return httpErrorResponse(error, "No pudimos crear tu solicitud de control crónico.");
  }
}
