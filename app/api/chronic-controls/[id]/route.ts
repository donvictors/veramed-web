import { NextResponse } from "next/server";
import { getChronicControlRecord, serializeChronicControlRecord } from "@/lib/server/chronic-control-store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const record = await getChronicControlRecord(id);

  if (!record) {
    return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }

  return NextResponse.json({ request: serializeChronicControlRecord(record) });
}
