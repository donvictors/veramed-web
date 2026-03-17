import { Prisma, TransbankTransactionStatusDb } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SymptomsPaymentTransactionRecord = {
  id: string;
  requestId: string;
  orderId: string;
  sessionId: string;
  amount: number;
  token: string;
  webpayUrl: string;
  status: "CREATED" | "PAID" | "REJECTED";
  authorizationCode?: string;
  buyOrder?: string;
  responseCode?: number;
  paymentTypeCode?: string;
  cardLast4?: string;
  transactionDate?: string;
  errorReason?: string;
  createdAt: number;
  updatedAt: number;
};

function toPublicStatus(status: TransbankTransactionStatusDb) {
  if (status === "paid") return "PAID";
  if (status === "rejected") return "REJECTED";
  return "CREATED";
}

function toJsonValue(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === undefined || value === null) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}

function getSymptomsPaymentTransactionDelegate() {
  const delegate = (prisma as unknown as Record<string, unknown>).symptomsPaymentTransaction as
    | { upsert?: unknown }
    | undefined;
  if (!delegate || typeof delegate.upsert !== "function") {
    throw new Error(
      "PrismaClient desactualizado para pagos de síntomas. Reinicia el servidor y ejecuta `npx prisma generate`.",
    );
  }
  return delegate;
}

function fromRow(row: {
  id: string;
  requestId: string;
  orderId: string;
  sessionId: string;
  amount: number;
  token: string;
  webpayUrl: string;
  status: TransbankTransactionStatusDb;
  authorizationCode: string | null;
  buyOrder: string | null;
  responseCode: number | null;
  paymentTypeCode: string | null;
  cardLast4: string | null;
  transactionDate: Date | null;
  errorReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SymptomsPaymentTransactionRecord {
  return {
    id: row.id,
    requestId: row.requestId,
    orderId: row.orderId,
    sessionId: row.sessionId,
    amount: row.amount,
    token: row.token,
    webpayUrl: row.webpayUrl,
    status: toPublicStatus(row.status),
    authorizationCode: row.authorizationCode ?? undefined,
    buyOrder: row.buyOrder ?? undefined,
    responseCode: row.responseCode ?? undefined,
    paymentTypeCode: row.paymentTypeCode ?? undefined,
    cardLast4: row.cardLast4 ?? undefined,
    transactionDate: row.transactionDate?.toISOString(),
    errorReason: row.errorReason ?? undefined,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

export async function upsertSymptomsPaymentTransaction(input: {
  requestId: string;
  orderId: string;
  sessionId: string;
  amount: number;
  token: string;
  webpayUrl: string;
}) {
  const tx = getSymptomsPaymentTransactionDelegate();
  const row = await (tx.upsert as (args: unknown) => Promise<unknown>)({
    where: { orderId: input.orderId },
    update: {
      requestId: input.requestId,
      sessionId: input.sessionId,
      amount: input.amount,
      token: input.token,
      webpayUrl: input.webpayUrl,
      status: "created",
      errorReason: null,
      authorizationCode: null,
      buyOrder: null,
      responseCode: null,
      paymentTypeCode: null,
      cardLast4: null,
      transactionDate: null,
      transbankResponse: Prisma.JsonNull,
      committedAt: null,
      paidAt: null,
    },
    create: {
      requestId: input.requestId,
      orderId: input.orderId,
      sessionId: input.sessionId,
      amount: input.amount,
      token: input.token,
      webpayUrl: input.webpayUrl,
      status: "created",
    },
  });

  return fromRow(row as Parameters<typeof fromRow>[0]);
}

export async function getSymptomsPaymentTransactionByToken(token: string) {
  const row = await prisma.symptomsPaymentTransaction.findUnique({
    where: { token },
  });
  if (!row) return null;
  return fromRow(row);
}

export async function getSymptomsPaymentTransactionByOrderId(orderId: string) {
  const row = await prisma.symptomsPaymentTransaction.findUnique({
    where: { orderId },
  });
  if (!row) return null;
  return fromRow(row);
}

export async function markSymptomsPaymentTransactionResult(input: {
  token: string;
  status: "PAID" | "REJECTED";
  authorizationCode?: string;
  buyOrder?: string;
  responseCode?: number;
  paymentTypeCode?: string;
  cardLast4?: string;
  transactionDate?: Date;
  rawResponse?: unknown;
  errorReason?: string;
}) {
  const row = await prisma.symptomsPaymentTransaction.update({
    where: { token: input.token },
    data: {
      status: input.status === "PAID" ? "paid" : "rejected",
      authorizationCode: input.authorizationCode ?? null,
      buyOrder: input.buyOrder ?? null,
      responseCode: input.responseCode ?? null,
      paymentTypeCode: input.paymentTypeCode ?? null,
      cardLast4: input.cardLast4 ?? null,
      transactionDate: input.transactionDate ?? null,
      transbankResponse: toJsonValue(input.rawResponse),
      errorReason: input.errorReason ?? null,
      committedAt: new Date(),
      paidAt: input.status === "PAID" ? new Date() : null,
    },
  });
  return fromRow(row);
}
