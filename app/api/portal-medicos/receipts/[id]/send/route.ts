import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendElectronicReceiptEmail } from "@/lib/server/electronic-receipts";
import {
  canManageMedicalUsers,
  MEDICAL_PORTAL_SESSION_COOKIE,
  recordMedicalAudit,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";
import { HttpRequestError, httpErrorResponse, requireSameOrigin } from "@/lib/server/http-security";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const cookieStore = await cookies();
    const session = await verifyMedicalPortalSessionToken(
      cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value,
    );
    if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    if (!canManageMedicalUsers(session)) {
      return NextResponse.json({ error: "No tienes permisos para enviar boletas." }, { status: 403 });
    }
    const { id } = await context.params;
    const receipt = await prisma.electronicReceipt.findUnique({ where: { id } });
    if (!receipt) throw new HttpRequestError("Boleta no encontrada.", 404);
    const result = await sendElectronicReceiptEmail(receipt.id);
    await recordMedicalAudit({
      session,
      action: "electronic_receipt.send",
      request,
      requestType: receipt.requestType,
      requestId: receipt.requestId,
      metadata: { receiptId: receipt.id, deduped: result.deduped },
    });
    return NextResponse.json({ ok: true, deduped: result.deduped });
  } catch (error) {
    console.error("POST /api/portal-medicos/receipts/[id]/send", error);
    return httpErrorResponse(error, "No pudimos enviar la boleta.");
  }
}
