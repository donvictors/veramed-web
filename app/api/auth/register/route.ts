import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE, validateRegisterInput } from "@/lib/auth";
import { getSessionTtlMs, registerUser } from "@/lib/server/auth-store";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    name?: string;
    email?: string;
    password?: string;
  };

  const errors = validateRegisterInput({
    name: payload.name,
    email: payload.email ?? "",
    password: payload.password ?? "",
  });

  if (errors.length > 0) {
    return NextResponse.json(
      {
        error: "Hay errores de validación.",
        details: errors,
      },
      { status: 400 },
    );
  }

  const result = await registerUser({
    name: payload.name ?? "",
    email: payload.email ?? "",
    password: payload.password ?? "",
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_SESSION_COOKIE, result.session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(getSessionTtlMs() / 1000),
  });

  return NextResponse.json({
    user: result.user,
  });
}
