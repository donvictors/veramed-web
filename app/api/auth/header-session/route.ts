import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { splitPatientFullName } from "@/lib/checkup";
import { getUserFromSession, logoutSession } from "@/lib/server/auth-store";
import {
  MEDICAL_PORTAL_SESSION_COOKIE,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";

function getShortName(fullName: string) {
  const name = splitPatientFullName(fullName);
  return [name.firstName, name.paternalSurname].filter(Boolean).join(" ") || fullName;
}

export async function GET() {
  const cookieStore = await cookies();
  const patientToken = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  const medicalToken = cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value;
  const [patient, medical] = await Promise.all([
    getUserFromSession(patientToken),
    verifyMedicalPortalSessionToken(medicalToken),
  ]);

  if (medical) {
    if (patientToken) {
      await logoutSession(patientToken);
      cookieStore.set(AUTH_SESSION_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
      });
    }
    return NextResponse.json(
      {
        authenticated: true,
        session: {
          kind: "medical",
          name: medical.name,
          shortName: getShortName(medical.name),
          email: medical.email,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  if (patient) {
    const fullName = patient.profile.fullName || patient.name;
    return NextResponse.json(
      {
        authenticated: true,
        session: {
          kind: "patient",
          name: fullName,
          shortName: getShortName(fullName),
          email: patient.profile.email || patient.email,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  return NextResponse.json(
    { authenticated: false, session: null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
