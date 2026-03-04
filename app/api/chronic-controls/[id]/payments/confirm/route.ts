import { NextResponse } from "next/server";
import { confirmChronicPendingPayment, serializeChronicControlRecord } from "@/lib/server/chronic-control-store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const record = await confirmChronicPendingPayment(id);

  if (!record) {
    return NextResponse.json(
      { error: "No hay un pago pendiente para esta solicitud." },
      { status: 404 },
    );
  }

  return NextResponse.json({ request: serializeChronicControlRecord(record) });
}
