import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { openMedicalPrescriptionPdf } from "@/lib/server/medical-prescriptions";
import {
  MEDICAL_PORTAL_SESSION_COOKIE,
  recordMedicalAudit,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const session = await verifyMedicalPortalSessionToken(
    cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value,
  );
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await context.params;
  const opened = await openMedicalPrescriptionPdf(id, session);
  if (!opened) {
    return NextResponse.json({ error: "Receta no encontrada o sin acceso." }, { status: 404 });
  }
  await recordMedicalAudit({
    session,
    action: "medical_prescription.download",
    request,
    metadata: { prescriptionId: opened.prescription.id },
  });
  return new Response(opened.stream, {
    headers: {
      "Content-Type": opened.contentType,
      "Content-Disposition": `inline; filename="${opened.fileName.replaceAll('"', "")}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
