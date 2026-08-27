import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { logoutSession } from "@/lib/server/auth-store";
import { httpErrorResponse, requireSameOrigin } from "@/lib/server/http-security";

export async function POST(request: Request) {
  try {
  requireSameOrigin(request);
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;

  await logoutSession(token);

  cookieStore.set(AUTH_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ ok: true });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos cerrar la sesión.");
  }
}
