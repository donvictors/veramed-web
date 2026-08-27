import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  beginTotpEnrollment,
  confirmTotpEnrollment,
  MEDICAL_PORTAL_SESSION_COOKIE,
  recordMedicalAudit,
  validateDoctorCredentials,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";
import { httpErrorResponse, readJsonBody, requireSameOrigin } from "@/lib/server/http-security";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    password: z.string().min(1).max(200),
    currentTotpCode: z.string().regex(/^\d{6}$/).optional(),
  }),
  z.object({ action: z.literal("confirm"), code: z.string().regex(/^\d{6}$/) }),
]);

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const cookieStore = await cookies();
    const session = await verifyMedicalPortalSessionToken(
      cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value,
    );
    if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

    const parsed = schema.safeParse(await readJsonBody(request, 4_000));
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload MFA inválido." }, { status: 400 });
    }

    if (parsed.data.action === "start") {
      const credentials = await validateDoctorCredentials({
        email: session.email,
        password: parsed.data.password,
        totpCode: parsed.data.currentTotpCode,
      });
      if (!credentials.ok) {
        return NextResponse.json({ error: credentials.reason }, { status: 401 });
      }
      const enrollment = await beginTotpEnrollment(session);
      await recordMedicalAudit({ session, action: "medical.mfa_enrollment_started", request });
      return NextResponse.json(enrollment, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const confirmed = await confirmTotpEnrollment(session, parsed.data.code);
    if (!confirmed) {
      return NextResponse.json({ error: "Código de autenticación inválido." }, { status: 400 });
    }
    await recordMedicalAudit({ session, action: "medical.mfa_enabled", request });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos configurar la autenticación de dos factores.");
  }
}
