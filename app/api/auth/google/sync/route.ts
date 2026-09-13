import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { getSessionTtlMs, loginOrRegisterOAuthUser } from "@/lib/server/auth-store";
import {
  MEDICAL_PORTAL_SESSION_COOKIE,
  revokeMedicalPortalSession,
} from "@/lib/server/medical-portal-auth";
import { enforceRateLimit, httpErrorResponse, requireSameOrigin } from "@/lib/server/http-security";

export async function POST(request: Request) {
  try {
  requireSameOrigin(request);
  await enforceRateLimit({ request, action: "auth:google-sync", limit: 20, windowMs: 15 * 60 * 1000 });
  const providerSession = await getServerSession(authOptions);
  const email = providerSession?.user?.email?.trim().toLowerCase() ?? "";

  if (!email) {
    return NextResponse.json({ error: "No se pudo validar la sesión de Google." }, { status: 401 });
  }

  const name = providerSession?.user?.name?.trim() || "Usuario Veramed";
  const result = await loginOrRegisterOAuthUser({ email, name });
  const cookieStore = await cookies();

  await revokeMedicalPortalSession(
    cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value,
  );
  cookieStore.set(MEDICAL_PORTAL_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  cookieStore.set(AUTH_SESSION_COOKIE, result.session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(getSessionTtlMs() / 1000),
  });

  return NextResponse.json({ user: result.user });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos sincronizar la cuenta de Google.");
  }
}
