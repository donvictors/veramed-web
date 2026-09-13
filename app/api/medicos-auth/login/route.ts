import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createMedicalPortalSession,
  getMedicalPortalSessionMaxAgeSeconds,
  MEDICAL_PORTAL_SESSION_COOKIE,
  recordMedicalAudit,
  validateDoctorCredentials,
} from "@/lib/server/medical-portal-auth";
import {
  enforceRateLimit,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";
import { splitMedicalPortalName } from "@/lib/medical-portal/profile";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { logoutSession } from "@/lib/server/auth-store";

type LoginBody = {
  email?: string;
  password?: string;
  totpCode?: string;
};

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await enforceRateLimit({
      request,
      action: "medical-auth:login",
      limit: 6,
      windowMs: 15 * 60 * 1000,
    });
    const body = (await readJsonBody(request, 8_000)) as LoginBody;

  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Debes ingresar correo y contraseña." },
      { status: 400 },
    );
  }

  const result = await validateDoctorCredentials({
    email,
    password,
    totpCode: body.totpCode?.trim(),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 401 });
  }

  const created = await createMedicalPortalSession({ userId: result.user.id, request });
  const cookieStore = await cookies();
  await logoutSession(cookieStore.get(AUTH_SESSION_COOKIE)?.value);
  cookieStore.set(AUTH_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  cookieStore.set(MEDICAL_PORTAL_SESSION_COOKIE, created.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getMedicalPortalSessionMaxAgeSeconds(),
  });

  const nameFields = {
    firstName: result.user.firstName,
    paternalSurname: result.user.paternalSurname,
    maternalSurname: result.user.maternalSurname,
  };
  const resolvedNameFields = nameFields.firstName
    ? nameFields
    : splitMedicalPortalName(result.user.name);

  await recordMedicalAudit({
    session: {
      sessionId: created.session.id,
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
      ...resolvedNameFields,
      specialty: result.user.specialty ?? undefined,
      medicalRut: result.user.medicalRut ?? undefined,
      sisRegistration: result.user.sisRegistration ?? undefined,
      role: result.user.role,
      expiresAt: created.session.expiresAt,
    },
    action: "medical.login",
    request,
  });

  return NextResponse.json({ ok: true });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos iniciar sesión en el portal médico.");
  }
}
