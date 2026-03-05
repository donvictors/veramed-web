import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";
import {
  confirmPendingPayment,
  getCheckupRecord,
  serializeCheckupRecord,
} from "@/lib/server/checkup-store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const current = await getCheckupRecord(id);

  if (!current) {
    return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }

  if (current.userId) {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    const user = await getUserFromSession(token);

    if (!user || user.id !== current.userId) {
      return NextResponse.json({ error: "No tienes acceso a esta solicitud." }, { status: 403 });
    }
  }

  const record = await confirmPendingPayment(id);

  if (!record) {
    return NextResponse.json(
      { error: "No hay un pago pendiente para esta solicitud." },
      { status: 404 },
    );
  }

  return NextResponse.json({ checkup: serializeCheckupRecord(record) });
}
