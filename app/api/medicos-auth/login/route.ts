import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createMedicalPortalSessionToken,
  getMedicalPortalSessionMaxAgeSeconds,
  MEDICAL_PORTAL_SESSION_COOKIE,
  validateDoctorCredentials,
} from "@/lib/server/medical-portal-auth";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Debes ingresar correo y contraseña." },
      { status: 400 },
    );
  }

  const result = validateDoctorCredentials({ email, password });
  if (!result.ok) {
    const status = result.reason === "Portal médico no configurado." ? 503 : 401;
    return NextResponse.json({ error: result.reason }, { status });
  }

  const cookieStore = await cookies();
  cookieStore.set(MEDICAL_PORTAL_SESSION_COOKIE, createMedicalPortalSessionToken(result.email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getMedicalPortalSessionMaxAgeSeconds(),
  });

  return NextResponse.json({ ok: true });
}
