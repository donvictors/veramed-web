import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";
import { listTelemedicineSlots, reserveTelemedicineSlot } from "@/lib/server/telemedicine";
import { enforceRateLimit, httpErrorResponse, readJsonBody, requireSameOrigin } from "@/lib/server/http-security";

export async function GET() { return NextResponse.json({ slots: await listTelemedicineSlots() }); }

const schema = z.object({ clinicianId: z.string().min(1), startsAt: z.string().datetime(), sourceFlow: z.string().min(1).max(60) });
export async function POST(request: Request) {
  try {
  requireSameOrigin(request);
  await enforceRateLimit({ request, action: "telemedicine:reserve", limit: 8, windowMs: 15 * 60 * 1000 });
  const user = await getUserFromSession((await cookies()).get(AUTH_SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "Ingresa a tu cuenta para reservar." }, { status: 401 });
  const parsed = schema.safeParse(await readJsonBody(request, 5_000));
  if (!parsed.success || new Date(parsed.data.startsAt) <= new Date()) return NextResponse.json({ error: "Horario no válido." }, { status: 400 });
  try {
    const appointment = await reserveTelemedicineSlot({ userId: user.id, clinicianId: parsed.data.clinicianId, startsAt: new Date(parsed.data.startsAt), sourceFlow: parsed.data.sourceFlow, patientData: { name: user.name, email: user.email } });
    return NextResponse.json({ id: appointment.id, status: appointment.status, priceClp: appointment.priceClp });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Ese horario acaba de ser tomado. Elige otro." }, { status: 409 });
    throw error;
  }
  } catch (error) {
    const security = httpErrorResponse(error, "");
    if (security.status !== 500) return security;
    return NextResponse.json({ error: "No pudimos reservar el horario." }, { status: 500 });
  }
}
