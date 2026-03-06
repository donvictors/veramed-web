export type NormalizedTransbankStatus = "PAID" | "REJECTED";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as UnknownRecord;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function asDate(value: unknown): Date | undefined {
  const text = asString(value);
  if (!text) return undefined;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function parseCreateResponse(raw: unknown) {
  const data = asRecord(raw);
  if (!data) {
    return null;
  }

  const token = asString(data.token);
  const url = asString(data.url);

  if (!token || !url) {
    return null;
  }

  return { token, url };
}

export function parseCommitResponse(raw: unknown) {
  const data = asRecord(raw);
  if (!data) {
    return {
      approved: false,
      status: undefined,
      responseCode: undefined,
      authorizationCode: undefined,
      amount: undefined,
      buyOrder: undefined,
    };
  }

  const status = asString(data.status);
  const responseCode = asNumber(data.response_code);
  const authorizationCode = asString(data.authorization_code);
  const amount = asNumber(data.amount);
  const buyOrder = asString(data.buy_order);
  const paymentTypeCode = asString(data.payment_type_code);
  const transactionDate = asDate(data.transaction_date);
  const sessionId = asString(data.session_id);
  const cardDetail = asRecord(data.card_detail);
  const cardLast4 = cardDetail ? asString(cardDetail.card_number) : undefined;
  const approved = status === "AUTHORIZED" && responseCode === 0;

  return {
    approved,
    status,
    responseCode,
    authorizationCode,
    amount,
    buyOrder,
    paymentTypeCode,
    transactionDate,
    sessionId,
    cardLast4,
  };
}

export function toNormalizedStatus(approved: boolean): NormalizedTransbankStatus {
  return approved ? "PAID" : "REJECTED";
}
