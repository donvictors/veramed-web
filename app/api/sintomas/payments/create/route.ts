import { NextResponse } from "next/server";
import { buildTransbankTransaction, getAppUrl } from "@/lib/server/transbank/config";
import { parseCreateResponse } from "@/lib/server/transbank/normalize";
import {
  calculateDiscountedAmount,
  getDiscountByCode,
  normalizeDiscountCode,
} from "@/lib/discount-codes";

export const runtime = "nodejs";

const SYMPTOMS_PRICE_CLP = 5990;
const BUY_ORDER_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_BUY_ORDER_LENGTH = 26;
const MAX_SESSION_ID_LENGTH = 61;

type Payload = {
  orderId?: string;
  sessionId?: string;
  discountCode?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validatePayload(payload: Payload) {
  const orderId = clean(payload.orderId);
  const sessionId = clean(payload.sessionId);
  const discountCode = normalizeDiscountCode(clean(payload.discountCode));

  if (!orderId) {
    return { ok: false, error: "orderId es obligatorio." } as const;
  }

  if (orderId.length > MAX_BUY_ORDER_LENGTH) {
    return { ok: false, error: `orderId excede el largo máximo (${MAX_BUY_ORDER_LENGTH}).` } as const;
  }

  if (!BUY_ORDER_PATTERN.test(orderId)) {
    return { ok: false, error: "orderId solo permite letras, números, guion y guion bajo." } as const;
  }

  if (!sessionId) {
    return { ok: false, error: "sessionId es obligatorio." } as const;
  }

  if (sessionId.length > MAX_SESSION_ID_LENGTH) {
    return { ok: false, error: `sessionId excede el largo máximo (${MAX_SESSION_ID_LENGTH}).` } as const;
  }

  return {
    ok: true,
    value: {
      orderId,
      sessionId,
      discountCode,
    },
  } as const;
}

export async function POST(request: Request) {
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const validation = validatePayload(payload);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    if (
      validation.value.discountCode &&
      !getDiscountByCode(validation.value.discountCode)
    ) {
      return NextResponse.json({ error: "Código de descuento inválido." }, { status: 400 });
    }

    const pricing = calculateDiscountedAmount(
      SYMPTOMS_PRICE_CLP,
      validation.value.discountCode,
    );
    const returnUrl = `${getAppUrl()}/api/sintomas/payments/return`;
    const transaction = buildTransbankTransaction();
    const raw = await transaction.create(
      validation.value.orderId,
      validation.value.sessionId,
      pricing.finalAmount,
      returnUrl,
    );
    const parsed = parseCreateResponse(raw);

    if (!parsed) {
      throw new Error("Respuesta inválida al crear transacción en Transbank.");
    }

    return NextResponse.json({
      token: parsed.token,
      url: parsed.url,
      amount: pricing.finalAmount,
      redirectUrl: `${parsed.url}?token_ws=${encodeURIComponent(parsed.token)}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos crear la transacción en Transbank.";
    console.error("POST /api/sintomas/payments/create", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
