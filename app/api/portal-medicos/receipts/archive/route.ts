import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { archiveReceiptWorkItem, restoreReceiptWorkItem, type ReceiptRequestType } from "@/lib/server/electronic-receipts";
import { canManageMedicalUsers, MEDICAL_PORTAL_SESSION_COOKIE, recordMedicalAudit, verifyMedicalPortalSessionToken } from "@/lib/server/medical-portal-auth";
import { httpErrorResponse, readJsonBody, requireSameOrigin } from "@/lib/server/http-security";

export const runtime = "nodejs";

function isRequestType(value: unknown): value is ReceiptRequestType {
  return value === "checkup" || value === "chronic_control" || value === "symptoms";
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const store = await cookies();
    const session = await verifyMedicalPortalSessionToken(store.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value);
    if (!session || !canManageMedicalUsers(session)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const body = await readJsonBody(request, 1_000) as { requestType?: unknown; requestId?: unknown; action?: unknown } | null;
    if (!isRequestType(body?.requestType) || typeof body.requestId !== "string" || !body.requestId.trim() || body.requestId.length > 100 || body.action !== "archive" && body.action !== "restore") {
      return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
    }
    const requestType = body.requestType;
    const requestId = body.requestId.trim();
    const row = body.action === "archive"
      ? await archiveReceiptWorkItem(requestType, requestId, session.userId)
      : await restoreReceiptWorkItem(requestType, requestId);
    await recordMedicalAudit({ session, action: body.action === "archive" ? "electronic_receipt.archive" : "electronic_receipt.restore", request, requestType, requestId, metadata: { receiptId: row.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return httpErrorResponse(error instanceof Error ? new Error(error.message) : error, "No pudimos actualizar el registro de boletas.");
  }
}
