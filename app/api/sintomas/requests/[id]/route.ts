import { NextResponse } from "next/server";
import { getSymptomsRequest } from "@/lib/server/symptoms-store";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Params) {
  const { id } = await context.params;
  const requestId = id?.trim();

  if (!requestId) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const record = await getSymptomsRequest(requestId);
  if (!record) {
    return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }

  return NextResponse.json({
    request: record,
  });
}

