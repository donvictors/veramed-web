import {
  createOrderId,
  joinPatientFullName,
  splitPatientFullName,
  recommend,
  type CheckupInput,
  type CheckupRecommendation,
  type PatientDetails,
  type StoredCheckupStatus,
  type StoredPayment,
} from "@/lib/checkup";
import { PaymentStatusDb, ReviewStatusDb } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CheckupRecord = {
  id: string;
  userId?: string;
  createdAt: number;
  updatedAt: number;
  input: CheckupInput;
  patient: PatientDetails;
  rec: CheckupRecommendation;
  payment: {
    pending: StoredPayment | null;
    confirmed: StoredPayment | null;
  };
  status: StoredCheckupStatus;
};

type CheckupRow = {
  id: string;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
  input: unknown;
  patientFirstName: string;
  patientPaternalSurname: string;
  patientMaternalSurname: string;
  patientRut: string;
  patientBirthDate: string;
  patientEmail: string;
  patientPhone: string;
  patientAddress: string;
  rec: unknown;
  reviewStatus: ReviewStatusDb;
  queuedAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  orderId: string | null;
  payment: {
    amount: number;
    currency: string;
    paymentId: string;
    cardLast4: string;
    cardholder: string;
    status: PaymentStatusDb;
    paidAt: Date | null;
  } | null;
};

const REVIEW_DELAY_MS = 8000;

function createCheckupRequestId(timestamp = Date.now()) {
  return `chk_${timestamp.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function serializePatientForDb(patient: PatientDetails) {
  const nameFields = splitPatientFullName(patient.fullName);
  return {
    patientFirstName: nameFields.firstName,
    patientPaternalSurname: nameFields.paternalSurname,
    patientMaternalSurname: nameFields.maternalSurname,
    patientRut: patient.rut,
    patientBirthDate: patient.birthDate,
    patientEmail: patient.email,
    patientPhone: patient.phone,
    patientAddress: patient.address,
  };
}

function fromRow(row: CheckupRow): CheckupRecord {
  const payment =
    row.payment?.status === "pending"
      ? {
          pending: {
            paid: false,
            amount: row.payment.amount,
            currency: row.payment.currency as "CLP",
            paidAt: 0,
            paymentId: row.payment.paymentId,
            cardLast4: row.payment.cardLast4,
            cardholder: row.payment.cardholder,
          },
          confirmed: null,
        }
      : row.payment
        ? {
            pending: null,
            confirmed: {
              paid: true,
              amount: row.payment.amount,
              currency: row.payment.currency as "CLP",
              paidAt: row.payment.paidAt?.getTime() ?? 0,
              paymentId: row.payment.paymentId,
              cardLast4: row.payment.cardLast4,
              cardholder: row.payment.cardholder,
            },
          }
        : {
            pending: null,
            confirmed: null,
          };

  return {
    id: row.id,
    userId: row.userId ?? undefined,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    input: row.input as CheckupInput,
    patient: {
      fullName: joinPatientFullName({
        firstName: row.patientFirstName,
        paternalSurname: row.patientPaternalSurname,
        maternalSurname: row.patientMaternalSurname,
      }),
      rut: row.patientRut,
      birthDate: row.patientBirthDate,
      email: row.patientEmail,
      phone: row.patientPhone,
      address: row.patientAddress,
    },
    rec: row.rec as CheckupRecommendation,
    payment,
    status: {
      status:
        row.reviewStatus === "approved"
          ? "approved"
          : row.reviewStatus === "rejected"
            ? "rejected"
            : "queued",
      queuedAt: row.queuedAt?.getTime(),
      approvedAt: row.approvedAt?.getTime(),
      rejectedAt: row.rejectedAt?.getTime(),
      orderId: row.orderId ?? undefined,
    },
  };
}

function shouldAutoApprove(record: CheckupRecord) {
  return (
    record.status.status === "queued" &&
    Boolean(record.status.queuedAt) &&
    Date.now() - (record.status.queuedAt ?? 0) >= REVIEW_DELAY_MS
  );
}

async function resolveStatus(record: CheckupRecord) {
  if (!shouldAutoApprove(record)) {
    return record;
  }

  const approvedAt = record.status.approvedAt ?? Date.now();
  const updated = await prisma.checkupRequest.update({
    where: { id: record.id },
    data: {
      reviewStatus: "approved",
      approvedAt: new Date(approvedAt),
    },
    include: { payment: true },
  });

  return fromRow(updated);
}

export async function createCheckupRecord(payload: {
  userId?: string;
  input: CheckupInput;
  patient: PatientDetails;
}) {
  const rec = recommend(payload.input);
  const record = await prisma.checkupRequest.create({
    data: {
      id: createCheckupRequestId(),
      userId: payload.userId ?? null,
      input: payload.input,
      ...serializePatientForDb(payload.patient),
      rec,
    },
    include: { payment: true },
  });

  return fromRow(record);
}

export async function getCheckupRecord(id: string) {
  const record = await prisma.checkupRequest.findUnique({
    where: { id },
    include: { payment: true },
  });

  if (!record) {
    return null;
  }

  return resolveStatus(fromRow(record));
}

export async function createPendingPayment(
  id: string,
  payment: Omit<StoredPayment, "paid" | "paidAt">,
) {
  const current = await prisma.checkupRequest.findUnique({
    where: { id },
    include: { payment: true },
  });

  if (!current) {
    return null;
  }

  const nextPayment: StoredPayment = {
    ...payment,
    paid: false,
    paidAt: 0,
  };

  const updated = await prisma.checkupRequest.update({
    where: { id },
    data: {
      payment: current.payment
        ? {
            update: {
              amount: nextPayment.amount,
              currency: nextPayment.currency,
              paymentId: nextPayment.paymentId,
              cardLast4: nextPayment.cardLast4,
              cardholder: nextPayment.cardholder,
              status: "pending",
              paidAt: null,
            },
          }
        : {
            create: {
              amount: nextPayment.amount,
              currency: nextPayment.currency,
              paymentId: nextPayment.paymentId,
              cardLast4: nextPayment.cardLast4,
              cardholder: nextPayment.cardholder,
              status: "pending",
            },
          },
    },
    include: { payment: true },
  });

  return fromRow(updated);
}

export async function confirmPendingPayment(id: string) {
  const current = await prisma.checkupRequest.findUnique({
    where: { id },
    include: { payment: true },
  });

  if (!current?.payment) {
    return null;
  }

  const pending = current.payment;
  const paidAt = Date.now();
  const confirmed: StoredPayment = {
    amount: pending.amount,
    currency: pending.currency as "CLP",
    paymentId: pending.paymentId,
    cardLast4: pending.cardLast4,
    cardholder: pending.cardholder,
    paid: true,
    paidAt,
  };

  const currentStatus = fromRow(current).status;
  const updated = await prisma.checkupRequest.update({
    where: { id },
    data: {
      reviewStatus: "queued",
      queuedAt: new Date(paidAt),
      approvedAt: null,
      rejectedAt: null,
      orderId: currentStatus.orderId ?? createOrderId(paidAt),
      payment: {
        update: {
          amount: confirmed.amount,
          currency: confirmed.currency,
          paymentId: confirmed.paymentId,
          cardLast4: confirmed.cardLast4,
          cardholder: confirmed.cardholder,
          status: "paid",
          paidAt: new Date(paidAt),
        },
      },
    },
    include: { payment: true },
  });

  return fromRow(updated);
}

export function serializeCheckupRecord(record: CheckupRecord) {
  return record;
}

export async function listCheckupsByUser(userId: string) {
  const rows = await prisma.checkupRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { payment: true },
  });

  const records = await Promise.all(rows.map((row) => resolveStatus(fromRow(row))));

  return records.map((record) => ({
    id: record.id,
    kind: "chequeo" as const,
    title: "Chequeo preventivo",
    patientName: record.patient.fullName || "Paciente",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    status: record.status.status,
    paid: Boolean(record.payment.confirmed?.paid),
    href: `/chequeo/orden?id=${record.id}`,
    reviewHref: `/chequeo/estado?id=${record.id}`,
  }));
}

export function getReviewDelayMs() {
  return REVIEW_DELAY_MS;
}
