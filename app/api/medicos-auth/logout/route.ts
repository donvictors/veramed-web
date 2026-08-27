import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  MEDICAL_PORTAL_SESSION_COOKIE,
  revokeMedicalPortalSession,
} from "@/lib/server/medical-portal-auth";
import { httpErrorResponse, requireSameOrigin } from "@/lib/server/http-security";

export async function POST(request: Request) {
  try {
  requireSameOrigin(request);
  const cookieStore = await cookies();
  const token = cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value;
  await revokeMedicalPortalSession(token);
  cookieStore.set(MEDICAL_PORTAL_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ ok: true });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos cerrar la sesión médica.");
  }
}
