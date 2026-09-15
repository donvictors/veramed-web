import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { archiveAllReceiptWorkItems } from "@/lib/server/electronic-receipts";
import { canManageMedicalUsers, MEDICAL_PORTAL_SESSION_COOKIE, recordMedicalAudit, verifyMedicalPortalSessionToken } from "@/lib/server/medical-portal-auth";
import { httpErrorResponse, readJsonBody, requireSameOrigin } from "@/lib/server/http-security";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const store = await cookies();
    const session = await verifyMedicalPortalSessionToken(store.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value);
    if (!session || !canManageMedicalUsers(session)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const body = await readJsonBody(request, 500) as { confirm?: unknown } | null;
    if (body?.confirm !== true) return NextResponse.json({ error: "Confirma el archivo masivo." }, { status: 400 });
    const archivedCount = await archiveAllReceiptWorkItems(session.userId);
    await recordMedicalAudit({ session, action: "electronic_receipt.archive_all", request, metadata: { archivedCount } });
    return NextResponse.json({ archivedCount }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos archivar todas las boletas.");
  }
}
