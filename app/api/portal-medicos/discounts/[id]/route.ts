import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManageMedicalUsers, MEDICAL_PORTAL_SESSION_COOKIE, recordMedicalAudit, verifyMedicalPortalSessionToken } from "@/lib/server/medical-portal-auth";
import { httpErrorResponse, readJsonBody, requireSameOrigin } from "@/lib/server/http-security";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const store = await cookies();
    const session = await verifyMedicalPortalSessionToken(store.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value);
    if (!session || !canManageMedicalUsers(session)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const { id } = await context.params;
    const body = await readJsonBody(request, 500) as { active?: unknown } | null;
    if (typeof body?.active !== "boolean") return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    const existing = await prisma.discountCode.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Código no encontrado." }, { status: 404 });
    const updated = await prisma.discountCode.update({ where: { id }, data: { active: body.active } });
    await recordMedicalAudit({ session, action: body.active ? "discount_code.activate" : "discount_code.deactivate", request, metadata: { discountCodeId: id } });
    return NextResponse.json({ id: updated.id, active: updated.active });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos cambiar el estado del código.");
  }
}
