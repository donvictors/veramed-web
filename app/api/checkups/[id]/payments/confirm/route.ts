import { NextResponse } from "next/server";
import { confirmPendingPayment, serializeCheckupRecord } from "@/lib/server/checkup-store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const record = await confirmPendingPayment(id);

  if (!record) {
    return NextResponse.json(
      { error: "No hay un pago pendiente para esta solicitud." },
      { status: 404 },
    );
  }

  return NextResponse.json({ checkup: serializeCheckupRecord(record) });
}
