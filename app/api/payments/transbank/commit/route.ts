import { NextResponse } from "next/server";
import {
  commitTransbankPayment,
  validateCommitPayload,
} from "@/lib/server/transbank/service";

export const runtime = "nodejs";

function resolveErrorStatus(message: string) {
  if (message.includes("obligatorio") || message.includes("inválido") || message.includes("Body")) {
    return 400;
  }
  if (message.includes("Token no encontrado")) {
    return 404;
  }
  return 500;
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const validation = validateCommitPayload(payload);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const result = await commitTransbankPayment(validation.token);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos confirmar el pago con Transbank.";
    console.error("POST /api/payments/transbank/commit", error);
    return NextResponse.json({ error: message }, { status: resolveErrorStatus(message) });
  }
}

