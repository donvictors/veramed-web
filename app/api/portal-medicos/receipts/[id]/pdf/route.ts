import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { openElectronicReceiptPdf } from "@/lib/server/electronic-receipts";
import {
  canManageMedicalUsers,
  MEDICAL_PORTAL_SESSION_COOKIE,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function attachmentName(value: string) {
  return value.replace(/[\r\n"\\]/g, "-");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const session = await verifyMedicalPortalSessionToken(
    cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value,
  );
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!canManageMedicalUsers(session)) {
    return NextResponse.json({ error: "No tienes permisos para descargar boletas." }, { status: 403 });
  }
  try {
    const { id } = await context.params;
    const pdf = await openElectronicReceiptPdf(id);
    return new Response(pdf.content, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${attachmentName(pdf.fileName)}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET /api/portal-medicos/receipts/[id]/pdf", error);
    return NextResponse.json({ error: "No pudimos abrir la boleta." }, { status: 404 });
  }
}
