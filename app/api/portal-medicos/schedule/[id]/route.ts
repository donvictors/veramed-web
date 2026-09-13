import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { scheduleBlockSchema } from "@/lib/medical-schedule";
import { deleteScheduleBlock, updateScheduleBlock } from "@/lib/server/medical-schedule";
import { MEDICAL_PORTAL_SESSION_COOKIE, recordMedicalAudit, verifyMedicalPortalSessionToken } from "@/lib/server/medical-portal-auth";
import { enforceRateLimit, HttpRequestError, httpErrorResponse, readJsonBody, requireSameOrigin } from "@/lib/server/http-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

async function authorized() {
  const store = await cookies();
  const session = await verifyMedicalPortalSessionToken(store.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value);
  if (!session) throw new HttpRequestError("No autorizado.", 401);
  return session;
}

export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const session = await authorized();
    await enforceRateLimit({ request, action: "medical-schedule-write", subject: session.userId, limit: 80, windowMs: 60 * 60 * 1000 });
    const parsed = scheduleBlockSchema.safeParse(await readJsonBody(request, 8_000));
    if (!parsed.success) throw new HttpRequestError(parsed.error.issues[0]?.message || "Revisa los datos del bloque.", 400);
    const { id } = await context.params;
    const block = await updateScheduleBlock(session.userId, id, parsed.data);
    await recordMedicalAudit({ session, action: "medical_schedule.block.update", request, metadata: { blockId: id, type: block.type, startsAt: block.startsAt } });
    return NextResponse.json({ ok: true, block });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos actualizar el bloque.");
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const session = await authorized();
    await enforceRateLimit({ request, action: "medical-schedule-write", subject: session.userId, limit: 80, windowMs: 60 * 60 * 1000 });
    const { id } = await context.params;
    await deleteScheduleBlock(session.userId, id);
    await recordMedicalAudit({ session, action: "medical_schedule.block.delete", request, metadata: { blockId: id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos eliminar el bloque.");
  }
}
