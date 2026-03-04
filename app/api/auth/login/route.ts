import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE, validateLoginInput } from "@/lib/auth";
import { getSessionTtlMs, loginUser } from "@/lib/server/auth-store";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    email?: string;
    password?: string;
  };

  const errors = validateLoginInput({
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

  const result = await loginUser({
    email: payload.email ?? "",
    password: payload.password ?? "",
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 401 });
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
