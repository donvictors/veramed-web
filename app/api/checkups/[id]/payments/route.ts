import { NextResponse } from "next/server";
import { createPendingPayment, serializeCheckupRecord } from "@/lib/server/checkup-store";
import { type StoredPayment } from "@/lib/checkup";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
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
