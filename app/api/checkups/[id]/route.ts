import { NextResponse } from "next/server";
import { getCheckupRecord, serializeCheckupRecord } from "@/lib/server/checkup-store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const record = await getCheckupRecord(id);

  if (!record) {
    return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }

  return NextResponse.json({ checkup: serializeCheckupRecord(record) });
}
