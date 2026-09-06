import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { calculateDiscountedAmount } from "@/lib/discount-pricing";
import {
  getDiscountByCode,
  normalizeDiscountCode,
} from "@/lib/server/discount-codes";
import { SYMPTOMS_PRICE_CLP } from "@/lib/symptoms-order";
import { getUserFromSession } from "@/lib/server/auth-store";
import { parseCreateResponse } from "@/lib/server/transbank/normalize";
import { buildTransbankTransaction, getAppUrl } from "@/lib/server/transbank/config";
import {
  getSymptomsRequest,
  markSymptomsPaymentPending,
} from "@/lib/server/symptoms-store";
import { upsertSymptomsPaymentTransaction } from "@/lib/server/symptoms-payment";
import {
  getRequestAccessCookieName,
  hasValidRequestAccessCookie,
} from "@/lib/server/request-access";
import {
  enforceRateLimit,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";

export const runtime = "nodejs";
const BUY_ORDER_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_BUY_ORDER_LENGTH = 26;
const MAX_SESSION_ID_LENGTH = 61;

const payloadSchema = z
  .object({
    orderId: z.string().min(1).max(MAX_BUY_ORDER_LENGTH),
    sessionId: z.string().min(1).max(MAX_SESSION_ID_LENGTH),
    discountCode: z.string().optional(),
  })
  .strict();

function mapCreatePaymentError(error: unknown): { status: number; message: string } {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      status: 503,
      message:
        "No pudimos conectar con nuestra base de datos en este momento. Intenta nuevamente en 1-2 minutos.",
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P1001") {
    return {
      status: 503,
      message:
        "No pudimos conectar con nuestra base de datos en este momento. Intenta nuevamente en 1-2 minutos.",
    };
  }

  const message =
    error instanceof Error ? error.message : "No pudimos crear la transacción en Transbank.";

  if (message.includes("Can't reach database server")) {
    return {
      status: 503,
      message:
        "No pudimos conectar con nuestra base de datos en este momento. Intenta nuevamente en 1-2 minutos.",
    };
  }

  return { status: 500, message };
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await enforceRateLimit({
      request,
      action: "symptoms:payment-create",
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    const parsed = payloadSchema.safeParse(await readJsonBody(request, 8_000));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido para pago de síntomas.", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const data = parsed.data;
    if (!BUY_ORDER_PATTERN.test(data.orderId)) {
      return NextResponse.json(
        { error: "orderId solo permite letras, números, guion y guion bajo." },
        { status: 400 },
      );
    }

    const discountCode = normalizeDiscountCode(data.discountCode);
    const appliedDiscount = await getDiscountByCode(discountCode);
    if (discountCode && !appliedDiscount) {
      return NextResponse.json({ error: "Código de descuento inválido." }, { status: 400 });
    }

    const pricing = calculateDiscountedAmount(SYMPTOMS_PRICE_CLP, appliedDiscount);
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    const user = await getUserFromSession(token);
    const currentAccessCookie = cookieStore.get(getRequestAccessCookieName())?.value;

    const existing = await getSymptomsRequest(data.orderId);
    if (!existing) {
      return NextResponse.json(
        { error: "La interpretación clínica no existe o ya no está disponible." },
        { status: 404 },
      );
    }

    if (existing.reviewStatus === "validated" || existing.reviewStatus === "rejected") {
      return NextResponse.json(
        { error: "Esta solicitud ya fue cerrada y no se puede modificar." },
        { status: 409 },
      );
    }
    if (existing.payment?.status === "paid") {
      return NextResponse.json(
        { error: "Esta solicitud ya tiene un pago confirmado." },
        { status: 409 },
      );
    }
    if (!existing.aiConsentAt || existing.aiConsentVersion !== "ai-health-data-v1") {
      return NextResponse.json(
        { error: "La solicitud no tiene un consentimiento clínico válido registrado." },
        { status: 409 },
      );
    }

    if (existing.userId) {
      if (!user || user.id !== existing.userId) {
        return NextResponse.json({ error: "No tienes acceso a esta solicitud." }, { status: 403 });
      }
    } else {
      const hasGuestAccess = hasValidRequestAccessCookie(currentAccessCookie, {
        requestType: "symptoms",
        requestId: existing.id,
        createdAtMs: existing.createdAt,
      });
      if (!hasGuestAccess) {
        return NextResponse.json({ error: "No tienes acceso a esta solicitud." }, { status: 403 });
      }
    }

    const returnUrl = `${getAppUrl()}/api/sintomas/payments/return`;
    const transaction = buildTransbankTransaction();
    const raw = await transaction.create(
      data.orderId,
      data.sessionId,
      pricing.finalAmount,
      returnUrl,
    );
    const created = parseCreateResponse(raw);
    if (!created) {
      throw new Error("Respuesta inválida al crear transacción en Transbank.");
    }

    await upsertSymptomsPaymentTransaction({
      requestId: data.orderId,
      orderId: data.orderId,
      sessionId: data.sessionId,
      amount: pricing.finalAmount,
      token: created.token,
      webpayUrl: created.url,
    });

    await markSymptomsPaymentPending({
      requestId: data.orderId,
      amount: pricing.finalAmount,
      currency: "CLP",
      paymentId: created.token,
    });

    return NextResponse.json({
      requestId: data.orderId,
      token: created.token,
      url: created.url,
      amount: pricing.finalAmount,
      redirectUrl: `${created.url}?token_ws=${encodeURIComponent(created.token)}`,
    });
  } catch (error) {
    console.error("POST /api/sintomas/payments/create", error);
    const securityResponse = httpErrorResponse(error, "");
    if (securityResponse.status !== 500) return securityResponse;
    const mapped = mapCreatePaymentError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
