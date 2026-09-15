import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  listReceiptWorkItems,
  listArchivedReceiptItems,
  saveElectronicReceipt,
  type ReceiptRequestType,
} from "@/lib/server/electronic-receipts";
import {
  canManageMedicalUsers,
  MEDICAL_PORTAL_SESSION_COOKIE,
  recordMedicalAudit,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";
import { HttpRequestError, httpErrorResponse, requireSameOrigin } from "@/lib/server/http-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAdminSession() {
  const cookieStore = await cookies();
  return verifyMedicalPortalSessionToken(
    cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value,
  );
}

function isRequestType(value: string): value is ReceiptRequestType {
  return value === "checkup" || value === "chronic_control" || value === "symptoms";
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!canManageMedicalUsers(session)) {
    return NextResponse.json({ error: "No tienes permisos para administrar boletas." }, { status: 403 });
  }
  const [items, archived] = await Promise.all([listReceiptWorkItems(), listArchivedReceiptItems()]);
  return NextResponse.json({ items, archived }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    if (!canManageMedicalUsers(session)) {
      return NextResponse.json({ error: "No tienes permisos para administrar boletas." }, { status: 403 });
    }

    const contentLength = Number(request.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > 11 * 1024 * 1024) {
      throw new HttpRequestError("El archivo supera el máximo permitido de 10 MB.", 413);
    }
    const form = await request.formData();
    const requestType = String(form.get("requestType") ?? "").trim();
    const requestId = String(form.get("requestId") ?? "").trim();
    const folio = String(form.get("folio") ?? "").trim();
    const file = form.get("file");
    if (!isRequestType(requestType) || !requestId || requestId.length > 100) {
      throw new HttpRequestError("Solicitud inválida.", 400);
    }
    if (!(file instanceof File)) {
      throw new HttpRequestError("Selecciona el PDF de la boleta.", 400);
    }

    const receipt = await saveElectronicReceipt({
      requestType,
      requestId,
      folio,
      file,
      uploadedByUserId: session.userId,
    });
    await recordMedicalAudit({
      session,
      action: "electronic_receipt.upload",
      request,
      requestType,
      requestId,
      metadata: { receiptId: receipt.id, folio: receipt.folio ?? "" },
    });
    return NextResponse.json({ ok: true, receiptId: receipt.id });
  } catch (error) {
    console.error("POST /api/portal-medicos/receipts", error);
    return httpErrorResponse(
      error instanceof Error && !(error instanceof HttpRequestError)
        ? new HttpRequestError(error.message, 400)
        : error,
      "No pudimos guardar la boleta.",
    );
  }
}
