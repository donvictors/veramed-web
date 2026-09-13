import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { scheduleBlockSchema } from "@/lib/medical-schedule";
import {
  createScheduleBlock,
  listScheduleBlocks,
} from "@/lib/server/medical-schedule";
import {
  MEDICAL_PORTAL_SESSION_COOKIE,
  recordMedicalAudit,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";
import {
  enforceRateLimit,
  HttpRequestError,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sessionIdentity() {
  const store = await cookies();
  return verifyMedicalPortalSessionToken(store.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value);
}

export async function GET(request: Request) {
  try {
    const session = await sessionIdentity();
    if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    const url = new URL(request.url);
    const from = new Date(url.searchParams.get("from") || "");
    const to = new Date(url.searchParams.get("to") || "");
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) {
      throw new HttpRequestError("Indica un rango válido.", 400);
    }
    return NextResponse.json(
      { blocks: await listScheduleBlocks(session.userId, from, to) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return httpErrorResponse(error, "No pudimos cargar tu agenda.");
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await sessionIdentity();
    if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    await enforceRateLimit({ request, action: "medical-schedule-write", subject: session.userId, limit: 80, windowMs: 60 * 60 * 1000 });
    const parsed = scheduleBlockSchema.safeParse(await readJsonBody(request, 8_000));
    if (!parsed.success) throw new HttpRequestError(parsed.error.issues[0]?.message || "Revisa los datos del bloque.", 400);
    const block = await createScheduleBlock(session.userId, parsed.data);
    await recordMedicalAudit({ session, action: "medical_schedule.block.create", request, metadata: { blockId: block.id, type: block.type, startsAt: block.startsAt } });
    return NextResponse.json({ ok: true, block });
  } catch (error) {
    console.error("POST /api/portal-medicos/schedule", error);
    return httpErrorResponse(error, "No pudimos crear el bloque.");
  }
}
