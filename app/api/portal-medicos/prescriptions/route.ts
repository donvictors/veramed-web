import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { issuePrescriptionSchema } from "@/lib/prescriptions";
import {
  issueMedicalPrescription,
  listMedicalPrescriptions,
} from "@/lib/server/medical-prescriptions";
import {
  canValidateMedicalOrders,
  MEDICAL_PORTAL_SESSION_COOKIE,
  recordMedicalAudit,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";
import {
  enforceRateLimit,
  HttpRequestError,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function medicalSession() {
  const cookieStore = await cookies();
  return verifyMedicalPortalSessionToken(
    cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value,
  );
}

export async function GET() {
  const session = await medicalSession();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!canValidateMedicalOrders(session)) {
    return NextResponse.json({ error: "Tu perfil no tiene permisos para emitir recetas." }, { status: 403 });
  }
  return NextResponse.json(
    { prescriptions: await listMedicalPrescriptions(session) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await medicalSession();
    if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    if (!canValidateMedicalOrders(session)) {
      return NextResponse.json({ error: "Tu perfil no tiene permisos para emitir recetas." }, { status: 403 });
    }
    if (!session.medicalRut?.trim() || !session.sisRegistration?.trim()) {
      throw new HttpRequestError(
        "Completa tu RUT médico y registro SIS en tu perfil antes de emitir recetas.",
        409,
      );
    }
    await enforceRateLimit({
      request,
      action: "medical-prescription-issue",
      subject: session.userId,
      limit: 12,
      windowMs: 60 * 60 * 1000,
    });
    const parsed = issuePrescriptionSchema.safeParse(await readJsonBody(request, 48_000));
    if (!parsed.success) {
      throw new HttpRequestError(
        parsed.error.issues[0]?.message || "Revisa los datos de la receta.",
        400,
      );
    }
    const result = await issueMedicalPrescription({
      session,
      patient: parsed.data.patient,
      items: parsed.data.items,
    });
    await recordMedicalAudit({
      session,
      action: "medical_prescription.issue",
      request,
      metadata: {
        prescriptionId: result.id,
        verificationCode: result.verificationCode,
        patientUserId: parsed.data.patient.userId,
        itemCount: parsed.data.items.length,
        emailSent: result.emailSent,
      },
    });
    return NextResponse.json({
      ok: true,
      ...result,
      downloadUrl: `/api/portal-medicos/prescriptions/${encodeURIComponent(result.id)}/pdf`,
    });
  } catch (error) {
    console.error("POST /api/portal-medicos/prescriptions", error);
    return httpErrorResponse(error, "No pudimos emitir la receta.");
  }
}
