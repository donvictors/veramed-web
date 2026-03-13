import { prisma } from "@/lib/prisma";
import { CHECKUP_PRICE_CLP, type StoredPayment } from "@/lib/checkup";
import {
  getChronicControlTotalPrice,
  type ChronicControlRecommendation,
} from "@/lib/chronic-control";
import { createPendingPayment, confirmPendingPayment } from "@/lib/server/checkup-store";
import {
  createChronicPendingPayment,
  confirmChronicPendingPayment,
} from "@/lib/server/chronic-control-store";
import { buildTransbankTransaction, getAppUrl } from "@/lib/server/transbank/config";
import {
  getPaymentByOrderId,
  getPaymentByToken,
  markPaymentResult,
  rebindTokenForOrder,
  upsertCreatedPayment,
  withCommitLock,
  type TransbankPaymentRecord,
  type TransbankRequestType,
} from "@/lib/server/transbank/store";
import {
  getRequestAccessTokenFromCookie,
  isRequestAccessTokenValid,
} from "@/lib/server/request-access";
import {
  parseCommitResponse,
  parseCreateResponse,
  toNormalizedStatus,
} from "@/lib/server/transbank/normalize";
import {
  calculateDiscountedAmount,
  getDiscountByCode,
  normalizeDiscountCode,
} from "@/lib/discount-codes";

const BUY_ORDER_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_BUY_ORDER_LENGTH = 26;
const MAX_SESSION_ID_LENGTH = 61;

export type CreateTransbankPaymentInput = {
  orderId: string;
  sessionId: string;
  amount: number;
  discountCode?: string;
};

export type NormalizedCommitResult = {
  orderId: string;
  requestType: TransbankRequestType;
  requestId: string;
  status: "PAID" | "REJECTED";
  authorizationCode?: string;
  amount?: number;
  buyOrder?: string;
};

type ResolvedOrderTarget = {
  requestType: TransbankRequestType;
  requestId: string;
  userId: string | null;
  createdAtMs: number;
  expectedAmount: number;
  alreadyPaid: boolean;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isAlreadyFinal(record: TransbankPaymentRecord | null) {
  return record?.status === "PAID" || record?.status === "REJECTED";
}

function isTransientCommitError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("network") ||
    normalized.includes("socket") ||
    normalized.includes("econnreset") ||
    normalized.includes("etimedout")
  );
}

function isPermanentCommitError(message: string) {
  const normalized = message.toLowerCase();
  if (isTransientCommitError(normalized)) {
    return false;
  }

  return (
    normalized.includes("token") ||
    normalized.includes("invalid") ||
    normalized.includes("invalido") ||
    normalized.includes("404") ||
    normalized.includes("422")
  );
}

function makePendingPayment(token: string, amount: number): Omit<StoredPayment, "paid" | "paidAt"> {
  return {
    amount,
    currency: "CLP",
    paymentId: token,
    cardLast4: "0000",
    cardholder: "Pago Webpay Plus",
  };
}

function toCreateResponse(record: TransbankPaymentRecord) {
  return {
    token: record.token,
    url: record.url,
    redirectUrl: `${record.url}?token_ws=${encodeURIComponent(record.token)}`,
  };
}

function toCommitResponse(record: TransbankPaymentRecord): NormalizedCommitResult {
  return {
    orderId: record.orderId,
    requestType: record.requestType,
    requestId: record.requestId,
    status: record.status === "PAID" ? "PAID" : "REJECTED",
    authorizationCode: record.authorizationCode,
    amount: record.amount,
    buyOrder: record.buyOrder ?? record.orderId,
  };
}

async function resolveOrderTarget(orderId: string): Promise<ResolvedOrderTarget> {
  const checkup = await prisma.checkupRequest.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      payment: { select: { status: true } },
    },
  });

  if (checkup) {
    return {
      requestType: "checkup",
      requestId: checkup.id,
      userId: checkup.userId,
      createdAtMs: checkup.createdAt.getTime(),
      expectedAmount: CHECKUP_PRICE_CLP,
      alreadyPaid: checkup.payment?.status === "paid",
    };
  }

  const chronic = await prisma.chronicControlRequest.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      rec: true,
      payment: { select: { status: true } },
    },
  });

  if (chronic) {
    const dynamicAmount = getChronicControlTotalPrice(
      chronic.rec as unknown as ChronicControlRecommendation,
    );
    return {
      requestType: "chronic_control",
      requestId: chronic.id,
      userId: chronic.userId,
      createdAtMs: chronic.createdAt.getTime(),
      expectedAmount: dynamicAmount,
      alreadyPaid: chronic.payment?.status === "paid",
    };
  }

  throw new Error("Solicitud no encontrada para iniciar pago.");
}

async function ensurePendingRequestPayment(
  target: Pick<ResolvedOrderTarget, "requestType" | "requestId">,
  token: string,
  amount: number,
) {
  const pending = makePendingPayment(token, amount);
  if (target.requestType === "checkup") {
    await createPendingPayment(target.requestId, pending);
    return;
  }
  await createChronicPendingPayment(target.requestId, pending);
}

async function syncApprovedBusinessPayment(
  payment: TransbankPaymentRecord,
  overrides: {
    cardLast4?: string;
  },
) {
  const details = {
    paymentId: payment.token,
    cardLast4: overrides.cardLast4 ?? "0000",
    cardholder: "Pago Webpay Plus",
  };

  await ensurePendingRequestPayment(
    {
      requestType: payment.requestType,
      requestId: payment.requestId,
    },
    payment.token,
    payment.amount,
  );

  if (payment.requestType === "checkup") {
    await confirmPendingPayment(payment.requestId, details);
    return;
  }

  await confirmChronicPendingPayment(payment.requestId, details);
}

function validateCommitPayloadAgainstRecord(
  record: TransbankPaymentRecord,
  parsed: ReturnType<typeof parseCommitResponse>,
) {
  if (parsed.buyOrder && parsed.buyOrder !== record.orderId) {
    return "buyOrder no coincide con la solicitud registrada.";
  }

  if (typeof parsed.amount === "number" && parsed.amount !== record.amount) {
    return "El monto confirmado no coincide con el monto esperado.";
  }

  if (parsed.sessionId && parsed.sessionId !== record.sessionId) {
    return "sessionId no coincide con la solicitud registrada.";
  }

  return null;
}

async function persistCommitResult(
  current: TransbankPaymentRecord,
  commitRaw: unknown,
  parsed: ReturnType<typeof parseCommitResponse>,
) {
  let status = toNormalizedStatus(parsed.approved);
  let errorReason: string | undefined;

  const integrityError = validateCommitPayloadAgainstRecord(current, parsed);
  if (integrityError) {
    status = "REJECTED";
    errorReason = integrityError;
  } else if (!parsed.approved) {
    errorReason =
      parsed.status && typeof parsed.responseCode === "number"
        ? `Transacción rechazada (${parsed.status}/${parsed.responseCode}).`
        : "Transacción rechazada por Transbank.";
  }

  const updatePayload = {
    status,
    authorizationCode: parsed.authorizationCode,
    buyOrder: parsed.buyOrder ?? current.orderId,
    responseCode: parsed.responseCode,
    paymentTypeCode: parsed.paymentTypeCode,
    cardLast4: parsed.cardLast4,
    transactionDate: parsed.transactionDate,
    transbankResponse: commitRaw,
    errorReason,
  } as const;

  let updated = await markPaymentResult(current.token, updatePayload);

  if (!updated) {
    await rebindTokenForOrder(current.orderId, current.token);
    updated = await markPaymentResult(current.token, updatePayload);
  }

  if (!updated) {
    throw new Error("No pudimos actualizar el estado de la transacción.");
  }

  if (updated.status === "PAID") {
    await syncApprovedBusinessPayment(updated, {
      cardLast4: parsed.cardLast4,
    });
  }

  return updated;
}

export function validateCreatePayload(
  payload: unknown,
):
  | {
      ok: true;
      value: CreateTransbankPaymentInput;
    }
  | {
      ok: false;
      error: string;
    } {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Body inválido." };
  }

  const data = payload as Record<string, unknown>;
  const orderId = cleanText(data.orderId);
  const sessionId = cleanText(data.sessionId);
  const amount = data.amount;
  const discountCode = normalizeDiscountCode(cleanText(data.discountCode));

  if (!orderId) {
    return { ok: false, error: "orderId es obligatorio." };
  }

  if (orderId.length > MAX_BUY_ORDER_LENGTH) {
    return {
      ok: false,
      error: `orderId excede el largo máximo (${MAX_BUY_ORDER_LENGTH}).`,
    };
  }

  if (!BUY_ORDER_PATTERN.test(orderId)) {
    return {
      ok: false,
      error: "orderId solo permite letras, números, guion y guion bajo.",
    };
  }

  if (!sessionId) {
    return { ok: false, error: "sessionId es obligatorio." };
  }

  if (sessionId.length > MAX_SESSION_ID_LENGTH) {
    return {
      ok: false,
      error: `sessionId excede el largo máximo (${MAX_SESSION_ID_LENGTH}).`,
    };
  }

  if (!isValidAmount(amount)) {
    return { ok: false, error: "amount debe ser un entero positivo." };
  }

  return {
    ok: true,
    value: {
      orderId,
      sessionId,
      amount,
      discountCode,
    },
  };
}

export function validateCommitPayload(payload: unknown):
  | {
      ok: true;
      token: string;
    }
  | {
      ok: false;
      error: string;
    } {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Body inválido." };
  }

  const token = cleanText((payload as Record<string, unknown>).token);
  if (!token) {
    return { ok: false, error: "token es obligatorio." };
  }

  return { ok: true, token };
}

export async function createTransbankPayment(
  input: CreateTransbankPaymentInput,
  actor?: {
    userId?: string;
    requestAccessCookie?: string;
  },
) {
  const target = await resolveOrderTarget(input.orderId);
  const normalizedDiscountCode = normalizeDiscountCode(input.discountCode);
  const appliedDiscount = getDiscountByCode(normalizedDiscountCode);
  const pricing = calculateDiscountedAmount(target.expectedAmount, normalizedDiscountCode);

  if (target.userId) {
    if (actor?.userId !== target.userId) {
      throw new Error("No tienes acceso a esta solicitud.");
    }
  } else {
    const providedAccessToken = getRequestAccessTokenFromCookie(actor?.requestAccessCookie, {
      requestType: target.requestType,
      requestId: target.requestId,
    });
    const hasGuestAccess = isRequestAccessTokenValid(providedAccessToken, {
      requestType: target.requestType,
      requestId: target.requestId,
      createdAtMs: target.createdAtMs,
    });
    if (!hasGuestAccess) {
      throw new Error("No tienes acceso a esta solicitud.");
    }
  }

  if (normalizedDiscountCode && !appliedDiscount) {
    throw new Error("Código de descuento inválido.");
  }

  if (pricing.finalAmount !== input.amount) {
    throw new Error("El monto no coincide con el valor de la solicitud.");
  }

  if (target.alreadyPaid) {
    throw new Error("La solicitud ya registra un pago confirmado.");
  }

  const existing = await getPaymentByOrderId(input.orderId);
  if (existing) {
    if (existing.status === "PAID") {
      throw new Error("La solicitud ya registra un pago confirmado.");
    }
  }

  const returnUrl = `${getAppUrl()}/api/payments/transbank/return`;
  const transaction = buildTransbankTransaction();
  const createRaw = await transaction.create(
    input.orderId,
    input.sessionId,
    pricing.finalAmount,
    returnUrl,
  );
  const parsed = parseCreateResponse(createRaw);

  if (!parsed) {
    throw new Error("Respuesta inválida al crear transacción en Transbank.");
  }

  const record = await upsertCreatedPayment({
    orderId: input.orderId,
    sessionId: input.sessionId,
    requestType: target.requestType,
    requestId: target.requestId,
    amount: pricing.finalAmount,
    token: parsed.token,
    url: parsed.url,
  });

  await ensurePendingRequestPayment(target, record.token, record.amount);
  return toCreateResponse(record);
}

export async function commitTransbankPayment(token: string): Promise<NormalizedCommitResult> {
  let knownRecord = await getPaymentByToken(token);
  const transaction = buildTransbankTransaction();

  if (!knownRecord) {
    try {
      const statusRaw = await transaction.status(token);
      const statusParsed = parseCommitResponse(statusRaw);
      if (!statusParsed.buyOrder) {
        throw new Error("Token no encontrado en solicitudes de pago.");
      }

      const byOrder = await getPaymentByOrderId(statusParsed.buyOrder);
      if (!byOrder) {
        throw new Error("Token no encontrado en solicitudes de pago.");
      }

      if (byOrder.status === "PAID") {
        return toCommitResponse(byOrder);
      }

      const rebound = await rebindTokenForOrder(byOrder.orderId, token);
      if (!rebound) {
        throw new Error("Token no encontrado en solicitudes de pago.");
      }

      knownRecord = rebound;
    } catch {
      throw new Error("Token no encontrado en solicitudes de pago.");
    }
  }

  if (isAlreadyFinal(knownRecord)) {
    return toCommitResponse(knownRecord);
  }

  const locked = await withCommitLock(token, async () => {
    const current = await getPaymentByToken(token);
    if (!current) {
      throw new Error("Token no encontrado en solicitudes de pago.");
    }

    if (isAlreadyFinal(current)) {
      return current;
    }

    try {
      const commitRaw = await transaction.commit(token);
      const parsed = parseCommitResponse(commitRaw);
      return await persistCommitResult(current, commitRaw, parsed);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Error de commit en Transbank.";

      try {
        const statusRaw = await transaction.status(token);
        const statusParsed = parseCommitResponse(statusRaw);
        return await persistCommitResult(current, statusRaw, statusParsed);
      } catch (statusError) {
        const statusReason =
          statusError instanceof Error ? statusError.message : "Error consultando estado en Transbank.";
        const combinedReason = `${reason} | status: ${statusReason}`;

        if (!isPermanentCommitError(combinedReason)) {
          throw new Error(combinedReason);
        }

        const rejected = await markPaymentResult(token, {
          status: "REJECTED",
          buyOrder: current.orderId,
          transbankResponse: { error: combinedReason },
          errorReason: combinedReason,
        });

        if (!rejected) {
          throw new Error(combinedReason);
        }

        return rejected;
      }
    }
  });

  return toCommitResponse(locked);
}
