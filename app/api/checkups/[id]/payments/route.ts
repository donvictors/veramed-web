import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";
import { createPendingPayment, serializeCheckupRecord } from "@/lib/server/checkup-store";
import { getCheckupRecord } from "@/lib/server/checkup-store";
import { type StoredPayment } from "@/lib/checkup";
import { hasValidInternalAccess } from "@/lib/server/internal-access";
import {
  getRequestAccessCookieName,
  hasValidRequestAccessCookie,
} from "@/lib/server/request-access";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const current = await getCheckupRecord(id);

  if (!current) {
    return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }

  const internalAccess = hasValidInternalAccess(request, {
    requestType: "checkup",
    requestId: id,
  });
  const cookieStore = await cookies();
  const requestAccessCookie = cookieStore.get(getRequestAccessCookieName())?.value;

  if (current.userId && !internalAccess) {
    const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    const user = await getUserFromSession(token);

    if (!user || user.id !== current.userId) {
      return NextResponse.json({ error: "No tienes acceso a esta solicitud." }, { status: 403 });
    }
  } else if (!current.userId && !internalAccess) {
    const hasGuestAccess = hasValidRequestAccessCookie(requestAccessCookie, {
      requestType: "checkup",
      requestId: id,
      createdAtMs: current.createdAt,
    });
    if (!hasGuestAccess) {
      return NextResponse.json({ error: "No tienes acceso a esta solicitud." }, { status: 403 });
    }
  }

  const payload = (await request.json()) as {
    payment?: Omit<StoredPayment, "paid" | "paidAt">;
  };

  if (!payload.payment) {
    return NextResponse.json({ error: "Pago inválido." }, { status: 400 });
  }

  const record = await createPendingPayment(id, payload.payment);
  if (!record) {
    return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }

  return NextResponse.json({ checkup: serializeCheckupRecord(record) });
}
