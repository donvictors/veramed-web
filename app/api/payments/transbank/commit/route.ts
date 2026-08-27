import { NextResponse } from "next/server";
import {
  commitTransbankPayment,
  validateCommitPayload,
} from "@/lib/server/transbank/service";
import {
  enforceRateLimit,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";

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
  try {
    requireSameOrigin(request);
    await enforceRateLimit({
      request,
      action: "transbank:commit",
      limit: 12,
      windowMs: 15 * 60 * 1000,
    });
    const payload = await readJsonBody(request, 4_000);

    const validation = validateCommitPayload(payload);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const result = await commitTransbankPayment(validation.token);
    return NextResponse.json(result);
  } catch (error) {
    const securityResponse = httpErrorResponse(error, "");
    if (securityResponse.status !== 500) return securityResponse;
    const message =
      error instanceof Error ? error.message : "No pudimos confirmar el pago con Transbank.";
    console.error("POST /api/payments/transbank/commit", error);
    return NextResponse.json({ error: message }, { status: resolveErrorStatus(message) });
  }
}
