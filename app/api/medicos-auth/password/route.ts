import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  MEDICAL_PORTAL_SESSION_COOKIE,
  recordMedicalAudit,
  validateDoctorCredentials,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";
import { hashPassword } from "@/lib/server/password-hashing";
import { httpErrorResponse, readJsonBody, requireSameOrigin } from "@/lib/server/http-security";

const schema = z.object({
  currentPassword: z.string().min(1).max(200),
  nextPassword: z.string().min(12).max(200),
  totpCode: z.string().regex(/^\d{6}$/).optional(),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value;
    const session = await verifyMedicalPortalSessionToken(rawToken);
    if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    const parsed = schema.safeParse(await readJsonBody(request, 4_000));
    if (!parsed.success) {
      return NextResponse.json({ error: "La nueva contraseña debe tener al menos 12 caracteres." }, { status: 400 });
    }
    const credentials = await validateDoctorCredentials({
      email: session.email,
      password: parsed.data.currentPassword,
      totpCode: parsed.data.totpCode,
    });
    if (!credentials.ok) {
      return NextResponse.json({ error: credentials.reason }, { status: 401 });
    }
    const { hash, salt } = hashPassword(parsed.data.nextPassword);
    await prisma.$transaction([
      prisma.medicalPortalUser.update({
        where: { id: session.userId },
        data: { passwordHash: hash, passwordSalt: salt },
      }),
      prisma.medicalPortalSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await recordMedicalAudit({ session, action: "medical.password_changed", request });
    cookieStore.set(MEDICAL_PORTAL_SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return NextResponse.json({ ok: true, loginRequired: true });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos actualizar la contraseña médica.");
  }
}
