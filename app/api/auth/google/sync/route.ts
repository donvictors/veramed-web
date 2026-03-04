import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { auth } from "@/lib/next-auth";
import { getSessionTtlMs, loginOrRegisterOAuthUser } from "@/lib/server/auth-store";

export async function POST() {
  const providerSession = await auth();
  const email = providerSession?.user?.email?.trim().toLowerCase() ?? "";

  if (!email) {
    return NextResponse.json({ error: "No se pudo validar la sesión de Google." }, { status: 401 });
  }

  const name = providerSession?.user?.name?.trim() || "Usuario Veramed";
  const result = await loginOrRegisterOAuthUser({ email, name });
  const cookieStore = await cookies();

  cookieStore.set(AUTH_SESSION_COOKIE, result.session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(getSessionTtlMs() / 1000),
  });

  return NextResponse.json({ user: result.user });
}
