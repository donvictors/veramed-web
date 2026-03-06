import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { createCheckupRecord, serializeCheckupRecord } from "@/lib/server/checkup-store";
import { getUserFromSession, syncUserProfileFromPatient } from "@/lib/server/auth-store";
import { type CheckupInput, type PatientDetails } from "@/lib/checkup";
import {
  getRequestAccessCookieName,
  upsertRequestAccessCookie,
} from "@/lib/server/request-access";

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
      input?: CheckupInput;
      patient?: PatientDetails;
    };

    if (!payload.input || !payload.patient) {
      return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    const user = await getUserFromSession(token);
    const patient = mergePatientDefaults(payload.patient, user?.profile);

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

    if (user?.id) {
      await syncUserProfileFromPatient(user.id, patient);
    }

    return NextResponse.json({ checkup: serializeCheckupRecord(record) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/checkups failed", error);
    return NextResponse.json(
      { error: "No pudimos crear tu solicitud de chequeo." },
      { status: 500 },
    );
  }
}
