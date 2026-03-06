import { prisma } from "@/lib/prisma";
import {
  Prisma,
  TransbankRequestTypeDb,
  TransbankTransactionStatusDb,
  type TransbankPaymentTransaction,
} from "@prisma/client";

export type TransbankPaymentStatus = "CREATED" | "PAID" | "REJECTED";
export type TransbankRequestType = "checkup" | "chronic_control";

export type TransbankPaymentRecord = {
  id: string;
  orderId: string;
  sessionId: string;
  requestType: TransbankRequestType;
  requestId: string;
  amount: number;
  token: string;
  url: string;
  status: TransbankPaymentStatus;
  authorizationCode?: string;
  buyOrder?: string;
  responseCode?: number;
  paymentTypeCode?: string;
  cardLast4?: string;
  transactionDate?: number;
  transbankResponse?: unknown;
  errorReason?: string;
  committedAt?: number;
  paidAt?: number;
  createdAt: number;
  updatedAt: number;
};

const inFlightCommits = new Map<string, Promise<TransbankPaymentRecord>>();
const memoryByToken = new Map<string, TransbankPaymentRecord>();
const memoryTokenByOrder = new Map<string, string>();

type TxDelegate = {
  findUnique: (...args: unknown[]) => Promise<TransbankPaymentTransaction | null>;
  create: (...args: unknown[]) => Promise<TransbankPaymentTransaction>;
  update: (...args: unknown[]) => Promise<TransbankPaymentTransaction>;
};

function getTransactionDelegate(): TxDelegate | null {
  const candidate = (prisma as unknown as Record<string, unknown>).transbankPaymentTransaction;
  if (
    candidate &&
    typeof candidate === "object" &&
    typeof (candidate as { findUnique?: unknown }).findUnique === "function" &&
    typeof (candidate as { create?: unknown }).create === "function" &&
    typeof (candidate as { update?: unknown }).update === "function"
  ) {
    return candidate as TxDelegate;
  }

  return null;
}

function createMemoryId() {
  return `tbk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function mapStatus(status: TransbankTransactionStatusDb): TransbankPaymentStatus {
  if (status === "paid") return "PAID";
  if (status === "rejected") return "REJECTED";
  return "CREATED";
}

function toDbStatus(status: TransbankPaymentStatus): TransbankTransactionStatusDb {
  if (status === "PAID") return "paid";
  if (status === "REJECTED") return "rejected";
  return "created";
}

function fromDb(row: TransbankPaymentTransaction): TransbankPaymentRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    sessionId: row.sessionId,
    requestType: row.requestType as TransbankRequestType,
    requestId: row.requestId,
    amount: row.amount,
    token: row.token,
    url: row.webpayUrl,
    status: mapStatus(row.status),
    authorizationCode: row.authorizationCode ?? undefined,
    buyOrder: row.buyOrder ?? undefined,
    responseCode: row.responseCode ?? undefined,
    paymentTypeCode: row.paymentTypeCode ?? undefined,
    cardLast4: row.cardLast4 ?? undefined,
    transactionDate: row.transactionDate?.getTime(),
    transbankResponse: row.transbankResponse ?? undefined,
    errorReason: row.errorReason ?? undefined,
    committedAt: row.committedAt?.getTime(),
    paidAt: row.paidAt?.getTime(),
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

export async function upsertCreatedPayment(input: {
  orderId: string;
  sessionId: string;
  requestType: TransbankRequestType;
  requestId: string;
  amount: number;
  token: string;
  url: string;
}) {
  const tx = getTransactionDelegate();
  if (!tx) {
    const existingToken = memoryTokenByOrder.get(input.orderId);
    if (existingToken) {
      const existing = memoryByToken.get(existingToken);
      if (existing) {
        if (existing.status !== "REJECTED") {
          const now = Date.now();
          const replaced: TransbankPaymentRecord = {
            ...existing,
            sessionId: input.sessionId,
            requestType: input.requestType,
            requestId: input.requestId,
            amount: input.amount,
            token: input.token,
            url: input.url,
            status: "CREATED",
            authorizationCode: undefined,
            buyOrder: undefined,
            responseCode: undefined,
            paymentTypeCode: undefined,
            cardLast4: undefined,
            transactionDate: undefined,
            transbankResponse: undefined,
            errorReason: undefined,
            committedAt: undefined,
            paidAt: undefined,
            updatedAt: now,
          };
          memoryByToken.delete(existingToken);
          memoryByToken.set(input.token, replaced);
          memoryTokenByOrder.set(input.orderId, input.token);
          return replaced;
        }
      }
    }

    const now = Date.now();
    const record: TransbankPaymentRecord = {
      id: createMemoryId(),
      orderId: input.orderId,
      sessionId: input.sessionId,
      requestType: input.requestType,
      requestId: input.requestId,
      amount: input.amount,
      token: input.token,
      url: input.url,
      status: "CREATED",
      createdAt: now,
      updatedAt: now,
    };

    memoryByToken.set(input.token, record);
    memoryTokenByOrder.set(input.orderId, input.token);
    console.error(
      "Transbank store fallback en memoria activo: PrismaClient no expone transbankPaymentTransaction.",
    );
    return record;
  }

  const existing = await tx.findUnique({
    where: { orderId: input.orderId },
  } as { where: { orderId: string } });

  if (existing) {
    if (existing.status === "paid") {
      throw new Error("La orden ya registra un pago confirmado.");
    }

    const replaced = await tx.update({
      where: { orderId: input.orderId },
      data: {
        sessionId: input.sessionId,
        requestType: input.requestType as TransbankRequestTypeDb,
        requestId: input.requestId,
        amount: input.amount,
        token: input.token,
        webpayUrl: input.url,
        status: "created",
        authorizationCode: null,
        buyOrder: null,
        responseCode: null,
        paymentTypeCode: null,
        cardLast4: null,
        transactionDate: null,
        transbankResponse: Prisma.JsonNull,
        errorReason: null,
        committedAt: null,
        paidAt: null,
      },
    });

    return fromDb(replaced);
  }

  try {
    const created = await tx.create({
      data: {
        orderId: input.orderId,
        sessionId: input.sessionId,
        requestType: input.requestType as TransbankRequestTypeDb,
        requestId: input.requestId,
        amount: input.amount,
        token: input.token,
        webpayUrl: input.url,
        status: "created",
      },
    });

    return fromDb(created);
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const collided = await tx.findUnique({
      where: { orderId: input.orderId },
    } as { where: { orderId: string } });

    if (!collided) {
      throw error;
    }

    if (collided.status === "paid") {
      throw new Error("La orden ya registra un pago confirmado.");
    }

    const replaced = await tx.update({
      where: { orderId: input.orderId },
      data: {
        sessionId: input.sessionId,
        requestType: input.requestType as TransbankRequestTypeDb,
        requestId: input.requestId,
        amount: input.amount,
        token: input.token,
        webpayUrl: input.url,
        status: "created",
        authorizationCode: null,
        buyOrder: null,
        responseCode: null,
        paymentTypeCode: null,
        cardLast4: null,
        transactionDate: null,
        transbankResponse: Prisma.JsonNull,
        errorReason: null,
        committedAt: null,
        paidAt: null,
      },
    });

    return fromDb(replaced);
  }
}

export async function getPaymentByToken(token: string) {
  const tx = getTransactionDelegate();
  if (!tx) {
    return memoryByToken.get(token) ?? null;
  }

  const record = await tx.findUnique({
    where: { token },
  } as { where: { token: string } });
  return record ? fromDb(record as TransbankPaymentTransaction) : null;
}

export async function getPaymentByOrderId(orderId: string) {
  const tx = getTransactionDelegate();
  if (!tx) {
    const token = memoryTokenByOrder.get(orderId);
    if (!token) return null;
    return memoryByToken.get(token) ?? null;
  }

  const record = await tx.findUnique({
    where: { orderId },
  } as { where: { orderId: string } });
  return record ? fromDb(record as TransbankPaymentTransaction) : null;
}

export async function markPaymentResult(
  token: string,
  input: {
    status: TransbankPaymentStatus;
    authorizationCode?: string;
    buyOrder?: string;
    responseCode?: number;
    paymentTypeCode?: string;
    cardLast4?: string;
    transactionDate?: Date;
    transbankResponse?: unknown;
    errorReason?: string;
  },
) {
  const tx = getTransactionDelegate();
  if (!tx) {
    const current = memoryByToken.get(token);
    if (!current) return null;

    const now = Date.now();
    const next: TransbankPaymentRecord = {
      ...current,
      status: input.status,
      authorizationCode: input.authorizationCode ?? current.authorizationCode,
      buyOrder: input.buyOrder ?? current.buyOrder,
      responseCode: input.responseCode ?? current.responseCode,
      paymentTypeCode: input.paymentTypeCode ?? current.paymentTypeCode,
      cardLast4: input.cardLast4 ?? current.cardLast4,
      transactionDate: (input.transactionDate ?? (current.transactionDate ? new Date(current.transactionDate) : undefined))?.getTime(),
      transbankResponse: input.transbankResponse ?? current.transbankResponse,
      errorReason: input.errorReason ?? current.errorReason,
      committedAt: now,
      paidAt: input.status === "PAID" ? now : current.paidAt,
      updatedAt: now,
    };

    memoryByToken.set(token, next);
    memoryTokenByOrder.set(next.orderId, token);
    return next;
  }

  const current = (await tx.findUnique({
    where: { token },
  } as { where: { token: string } })) as TransbankPaymentTransaction | null;

  if (!current) {
    return null;
  }

  const now = new Date();
  const updated = await tx.update({
    where: { token },
    data: {
      status: toDbStatus(input.status),
      authorizationCode: input.authorizationCode ?? current.authorizationCode,
      buyOrder: input.buyOrder ?? current.buyOrder,
      responseCode: input.responseCode ?? current.responseCode,
      paymentTypeCode: input.paymentTypeCode ?? current.paymentTypeCode,
      cardLast4: input.cardLast4 ?? current.cardLast4,
      transactionDate: input.transactionDate ?? current.transactionDate,
      transbankResponse:
        input.transbankResponse !== undefined
          ? (input.transbankResponse as Prisma.InputJsonValue)
          : current.transbankResponse === null
            ? Prisma.JsonNull
            : (current.transbankResponse as Prisma.InputJsonValue),
      errorReason: input.errorReason ?? current.errorReason,
      committedAt: now,
      paidAt: input.status === "PAID" ? now : current.paidAt,
    },
  });

  return fromDb(updated as TransbankPaymentTransaction);
}

export async function rebindTokenForOrder(orderId: string, newToken: string) {
  const tx = getTransactionDelegate();
  if (!tx) {
    const currentToken = memoryTokenByOrder.get(orderId);
    if (!currentToken) return null;
    const current = memoryByToken.get(currentToken);
    if (!current) return null;
    memoryByToken.delete(currentToken);
    const next = {
      ...current,
      token: newToken,
      updatedAt: Date.now(),
    };
    memoryByToken.set(newToken, next);
    memoryTokenByOrder.set(orderId, newToken);
    return next;
  }

  const updated = await tx.update({
    where: { orderId },
    data: { token: newToken },
  } as { where: { orderId: string }; data: { token: string } });

  return fromDb(updated as TransbankPaymentTransaction);
}

export async function withCommitLock(token: string, run: () => Promise<TransbankPaymentRecord>) {
  const current = inFlightCommits.get(token);
  if (current) {
    return current;
  }

  const nextPromise = run().finally(() => {
    inFlightCommits.delete(token);
  });
  inFlightCommits.set(token, nextPromise);
  return nextPromise;
}
