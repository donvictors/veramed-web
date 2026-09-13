import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { scheduleAppointmentSchema } from "@/lib/medical-schedule";
import { addScheduleAppointment, removeScheduleAppointment } from "@/lib/server/medical-schedule";
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

export async function POST(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const session = await authorized();
    await enforceRateLimit({ request, action: "medical-schedule-patient", subject: session.userId, limit: 100, windowMs: 60 * 60 * 1000 });
    const parsed = scheduleAppointmentSchema.safeParse(await readJsonBody(request, 4_000));
    if (!parsed.success) throw new HttpRequestError(parsed.error.issues[0]?.message || "Revisa los datos del paciente.", 400);
    const { id } = await context.params;
    await addScheduleAppointment(session.userId, id, parsed.data.rut, parsed.data.notes);
    await recordMedicalAudit({ session, action: "medical_schedule.patient.add", request, metadata: { blockId: id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos añadir al paciente.");
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const session = await authorized();
    await enforceRateLimit({ request, action: "medical-schedule-patient", subject: session.userId, limit: 100, windowMs: 60 * 60 * 1000 });
    const appointmentId = new URL(request.url).searchParams.get("appointmentId") || "";
    if (!appointmentId) throw new HttpRequestError("Cita no indicada.", 400);
    const { id } = await context.params;
    await removeScheduleAppointment(session.userId, id, appointmentId);
    await recordMedicalAudit({ session, action: "medical_schedule.patient.remove", request, metadata: { blockId: id, appointmentId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos retirar al paciente.");
  }
}
