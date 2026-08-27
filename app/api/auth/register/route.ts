import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE, validateRegisterInput } from "@/lib/auth";
import { getSessionTtlMs, registerUser } from "@/lib/server/auth-store";
import {
  enforceRateLimit,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await enforceRateLimit({ request, action: "auth:register", limit: 5, windowMs: 60 * 60 * 1000 });
    const payload = (await readJsonBody(request, 8_000)) as {
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

    return NextResponse.json({ user: result.user });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos crear la cuenta.");
  }
}
