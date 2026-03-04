import { NextResponse } from "next/server";
import { createChronicPendingPayment, serializeChronicControlRecord } from "@/lib/server/chronic-control-store";
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

  const record = await createChronicPendingPayment(id, payload.payment);
  if (!record) {
    return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }

  return NextResponse.json({ request: serializeChronicControlRecord(record) });
}
