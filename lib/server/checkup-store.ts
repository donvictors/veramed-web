import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createOrderId,
  recommend,
  type CheckupInput,
  type CheckupRecommendation,
  type PatientDetails,
  type StoredCheckupStatus,
  type StoredPayment,
} from "@/lib/checkup";

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

type CheckupStore = {
  checkups: Record<string, CheckupRecord>;
};

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "checkups.json");
const REVIEW_DELAY_MS = 8000;

function createEmptyStore(): CheckupStore {
  return { checkups: {} };
}

async function ensureStoreFile() {
  await mkdir(STORE_DIR, { recursive: true });
  try {
    await readFile(STORE_FILE, "utf8");
  } catch {
    await writeFile(STORE_FILE, JSON.stringify(createEmptyStore(), null, 2), "utf8");
  }
}

async function readStore() {
  await ensureStoreFile();
  const raw = await readFile(STORE_FILE, "utf8");
  return JSON.parse(raw) as CheckupStore;
}

async function writeStore(store: CheckupStore) {
  await ensureStoreFile();
  await writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

function createCheckupRequestId(timestamp = Date.now()) {
  return `chk_${timestamp.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function resolveStatus(record: CheckupRecord) {
  if (record.status.status !== "queued" || !record.status.queuedAt) {
    return record;
  }

  const elapsed = Date.now() - record.status.queuedAt;
  if (elapsed < REVIEW_DELAY_MS) {
    return record;
  }

  const approvedAt = record.status.approvedAt ?? Date.now();

  return {
      ...record,
      updatedAt: approvedAt,
      status: {
        ...record.status,
        status: "approved" as const,
        approvedAt,
      },
    };
}

async function withStore<T>(updater: (store: CheckupStore) => T | Promise<T>) {
  const store = await readStore();
  const result = await updater(store);
  await writeStore(store);
  return result;
}

export async function createCheckupRecord(payload: {
  userId?: string;
  input: CheckupInput;
  patient: PatientDetails;
}) {
  return withStore((store) => {
    const now = Date.now();
    const id = createCheckupRequestId(now);
    const rec = recommend(payload.input);
    const record: CheckupRecord = {
      id,
      userId: payload.userId,
      createdAt: now,
      updatedAt: now,
      input: payload.input,
      patient: payload.patient,
      rec,
      payment: {
        pending: null,
        confirmed: null,
      },
      status: {
        status: "queued",
      },
    };

    store.checkups[id] = record;
    return record;
  });
}

export async function getCheckupRecord(id: string) {
  return withStore((store) => {
    const current = store.checkups[id];
    if (!current) return null;

    const next = resolveStatus(current);
    if (next !== current) {
      store.checkups[id] = next;
    }

    return next;
  });
}

export async function createPendingPayment(
  id: string,
  payment: Omit<StoredPayment, "paid" | "paidAt">,
) {
  return withStore((store) => {
    const current = store.checkups[id];
    if (!current) return null;

    const nextPayment: StoredPayment = {
      ...payment,
      paid: false,
      paidAt: 0,
    };

    const nextRecord: CheckupRecord = {
      ...current,
      updatedAt: Date.now(),
      payment: {
        ...current.payment,
        pending: nextPayment,
      },
    };

    store.checkups[id] = nextRecord;
    return nextRecord;
  });
}

export async function confirmPendingPayment(id: string) {
  return withStore((store) => {
    const current = store.checkups[id];
    if (!current || !current.payment.pending) return null;

    const paidAt = Date.now();
    const confirmed: StoredPayment = {
      ...current.payment.pending,
      paid: true,
      paidAt,
    };

    const nextRecord: CheckupRecord = {
      ...current,
      updatedAt: paidAt,
      payment: {
        pending: null,
        confirmed,
      },
      status: {
        status: "queued",
        queuedAt: paidAt,
        orderId: current.status.orderId ?? createOrderId(paidAt),
      },
    };

    store.checkups[id] = nextRecord;
    return nextRecord;
  });
}

export function serializeCheckupRecord(record: CheckupRecord) {
  const resolved = resolveStatus(record);

  return {
    id: resolved.id,
    userId: resolved.userId,
    createdAt: resolved.createdAt,
    updatedAt: resolved.updatedAt,
    input: resolved.input,
    patient: resolved.patient,
    rec: resolved.rec,
    payment: {
      pending: resolved.payment.pending,
      confirmed: resolved.payment.confirmed,
    },
    status: resolved.status,
  };
}

export async function listCheckupsByUser(userId: string) {
  return withStore((store) =>
    Object.values(store.checkups)
      .map((record) => resolveStatus(record))
      .filter((record) => record.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((record) => ({
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
      })),
  );
}

export function getReviewDelayMs() {
  return REVIEW_DELAY_MS;
}
