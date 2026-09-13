import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { createCheckupRecord, serializeCheckupRecord } from "@/lib/server/checkup-store";
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
import { createCheckupSchema } from "@/lib/server/request-schemas";

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
      action: "checkup:create",
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    const parsed = createCheckupSchema.safeParse(await readJsonBody(request, 24_000));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de chequeo inválidos.", details: parsed.error.issues },
        { status: 400 },
      );
    }
    const payload = parsed.data;

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    const user = await getUserFromSession(token);
    const patient = mergePatientDefaults(payload.patient, user?.profile);

    if (user?.id) {
      await syncUserProfileFromPatient(user.id, patient, payload.input.sex);
    }

    const record = await createCheckupRecord({
      userId: user?.id,
      input: payload.input,
      patient,
    });

    if (!user?.id) {
      const currentAccessCookie = cookieStore.get(getRequestAccessCookieName())?.value;
      const nextAccessCookie = upsertRequestAccessCookie(currentAccessCookie, {
        requestType: "checkup",
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

    return NextResponse.json({ checkup: serializeCheckupRecord(record) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/checkups failed", error);
    return httpErrorResponse(error, "No pudimos crear tu solicitud de chequeo.");
  }
}
