import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { listAutomaticOrders } from "@/lib/server/automatic-orders";
import { canManageMedicalUsers, MEDICAL_PORTAL_SESSION_COOKIE, recordMedicalAudit, verifyMedicalPortalSessionToken } from "@/lib/server/medical-portal-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const store = await cookies();
  const session = await verifyMedicalPortalSessionToken(store.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!canManageMedicalUsers(session)) return NextResponse.json({ error: "No tienes permisos para ver este monitor." }, { status: 403 });
  try {
    const result = await listAutomaticOrders();
    await recordMedicalAudit({ session, action: "automatic_orders.list", request, metadata: { resultCount: result.items.length } });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/portal-medicos/automatic-orders", error);
    return NextResponse.json({ error: "No pudimos cargar las órdenes automáticas." }, { status: 500 });
  }
}
