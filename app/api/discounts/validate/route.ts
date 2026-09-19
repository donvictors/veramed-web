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
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";
import {
  enforceRateLimit,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";

type RequestType = "checkup" | "chronic_control" | "symptoms" | "new_service" | "telemedicine";

function isRequestType(value: unknown): value is RequestType {
  return value === "checkup" || value === "chronic_control" || value === "symptoms" || value === "new_service" || value === "telemedicine";
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
  } else if (body.requestType === "new_service" || body.requestType === "telemedicine") {
    const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
    const user = await getUserFromSession((await cookies()).get(AUTH_SESSION_COOKIE)?.value);
    if (!requestId || !user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    if (body.requestType === "new_service") {
      const row = await prisma.newServiceRequest.findUnique({ where: { id: requestId }, select: { userId: true, priceClp: true } });
      if (!row || row.userId !== user.id || !row.priceClp) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
      baseAmount = row.priceClp;
    } else {
      const row = await prisma.telemedicineAppointment.findUnique({ where: { id: requestId }, select: { userId: true, priceClp: true } });
      if (!row || row.userId !== user.id) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
      baseAmount = row.priceClp;
    }
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
