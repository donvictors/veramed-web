import { NextResponse } from "next/server";
import { CHECKUP_PRICE_CLP } from "@/lib/checkup";
import { getChronicControlTotalPrice, type ChronicControlRecommendation } from "@/lib/chronic-control";
import { SYMPTOMS_PRICE_CLP } from "@/lib/symptoms-order";
import { prisma } from "@/lib/prisma";
import { calculateDiscountedAmount } from "@/lib/discount-pricing";
import {
  getDiscountByCode,
  normalizeDiscountCode,
} from "@/lib/server/discount-codes";
import { authorizeOrderRequest } from "@/lib/server/order-request-authorization";
import {
  enforceRateLimit,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";

type RequestType = "checkup" | "chronic_control" | "symptoms";

function isRequestType(value: unknown): value is RequestType {
  return value === "checkup" || value === "chronic_control" || value === "symptoms";
}

export async function POST(request: Request) {
  try {
  requireSameOrigin(request);
  await enforceRateLimit({ request, action: "discount:validate", limit: 20, windowMs: 15 * 60 * 1000 });
  const body = (await readJsonBody(request, 4_000)) as
    | { requestType?: unknown; requestId?: unknown; code?: unknown }
    | null;
  if (!body || !isRequestType(body.requestType) || typeof body.code !== "string") {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const code = normalizeDiscountCode(body.code);
  if (!code || code.length > 80) {
    return NextResponse.json({ error: "Código no válido" }, { status: 400 });
  }

  let baseAmount: number;
  if (body.requestType === "symptoms") {
    baseAmount = SYMPTOMS_PRICE_CLP;
  } else {
    const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
    if (!requestId) {
      return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
    }
    const authorization = await authorizeOrderRequest(request, body.requestType, requestId);
    if (!authorization.ok) {
      return NextResponse.json(
        { error: authorization.error },
        { status: authorization.status },
      );
    }

    if (body.requestType === "checkup") {
      baseAmount = CHECKUP_PRICE_CLP;
    } else {
      const row = await prisma.chronicControlRequest.findUnique({
        where: { id: requestId },
        select: { rec: true },
      });
      if (!row) {
        return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
      }
      baseAmount = getChronicControlTotalPrice(
        row.rec as unknown as ChronicControlRecommendation,
      );
    }
  }

  const discount = await getDiscountByCode(code);
  if (!discount) {
    return NextResponse.json({ error: "Código no válido" }, { status: 400 });
  }

  return NextResponse.json({
    appliedCode: code,
    pricing: calculateDiscountedAmount(baseAmount, discount),
  });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos validar el código.");
  }
}
