import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isValidRut } from "@/lib/checkup";
import { findPrescriptionPatientByRut } from "@/lib/server/medical-prescriptions";
import {
  canValidateMedicalOrders,
  MEDICAL_PORTAL_SESSION_COOKIE,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";
import { enforceRateLimit, httpErrorResponse } from "@/lib/server/http-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = await verifyMedicalPortalSessionToken(
      cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value,
    );
    if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    if (!canValidateMedicalOrders(session)) {
      return NextResponse.json({ error: "Tu perfil no tiene permisos para emitir recetas." }, { status: 403 });
    }
    await enforceRateLimit({
      request,
      action: "medical-prescription-patient-search",
      subject: session.userId,
      limit: 40,
      windowMs: 60_000,
    });
    const rut = new URL(request.url).searchParams.get("rut")?.trim() || "";
    if (!isValidRut(rut)) {
      return NextResponse.json({ error: "Ingresa un RUT válido." }, { status: 400 });
    }
    const patient = await findPrescriptionPatientByRut(rut);
    if (!patient) {
      return NextResponse.json(
        { error: "No encontramos una cuenta de paciente asociada a ese RUT." },
        { status: 404 },
      );
    }
    return NextResponse.json({ patient }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos buscar al paciente.");
  }
}
