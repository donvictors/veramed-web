import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createOrderId, type PatientDetails, type StoredCheckupStatus, type StoredPayment } from "@/lib/checkup";
import {
  recommendMultipleChronicControls,
  type ChronicCondition,
  type ChronicControlRecommendation,
  type MedicationOption,
} from "@/lib/chronic-control";

type ChronicControlRecord = {
  id: string;
  createdAt: number;
  updatedAt: number;
  conditions: ChronicCondition[];
  patient: PatientDetails;
  yearsSinceDiagnosis: number;
  hasRecentChanges: boolean;
  usesMedication: boolean;
  selectedMedications: MedicationOption[];
  rec: ChronicControlRecommendation;
  payment: {
    pending: StoredPayment | null;
    confirmed: StoredPayment | null;
  };
  status: StoredCheckupStatus;
};

type ChronicControlStore = {
  requests: Record<string, ChronicControlRecord>;
};

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "chronic-controls.json");
const REVIEW_DELAY_MS = 8000;

function createEmptyStore(): ChronicControlStore {
  return { requests: {} };
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
  return JSON.parse(raw) as ChronicControlStore;
}

async function writeStore(store: ChronicControlStore) {
  await ensureStoreFile();
  await writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

function createRequestId(timestamp = Date.now()) {
  return `chr_${timestamp.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function resolveStatus(record: ChronicControlRecord) {
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

async function withStore<T>(updater: (store: ChronicControlStore) => T | Promise<T>) {
  const store = await readStore();
  const result = await updater(store);
  await writeStore(store);
  return result;
}

export async function createChronicControlRecord(payload: {
  conditions: ChronicCondition[];
  patient: PatientDetails;
  yearsSinceDiagnosis: number;
  hasRecentChanges: boolean;
  usesMedication: boolean;
  selectedMedications: MedicationOption[];
}) {
  return withStore((store) => {
    const now = Date.now();
    const id = createRequestId(now);
    const rec = recommendMultipleChronicControls(
      payload.conditions,
      payload.hasRecentChanges,
      payload.usesMedication,
      payload.selectedMedications,
    );

    const record: ChronicControlRecord = {
      id,
      createdAt: now,
      updatedAt: now,
      conditions: payload.conditions.length > 0 ? payload.conditions : ["hypertension"],
      patient: payload.patient,
      yearsSinceDiagnosis: payload.yearsSinceDiagnosis,
      hasRecentChanges: payload.hasRecentChanges,
      usesMedication: payload.usesMedication,
      selectedMedications: payload.selectedMedications,
      rec,
      payment: {
        pending: null,
        confirmed: null,
      },
      status: {
        status: "queued",
      },
    };

    store.requests[id] = record;
    return record;
  });
}

export async function getChronicControlRecord(id: string) {
  return withStore((store) => {
    const current = store.requests[id];
    if (!current) return null;

    const next = resolveStatus(current);
    if (next !== current) {
      store.requests[id] = next;
    }

    return next;
  });
}

export async function createChronicPendingPayment(
  id: string,
  payment: Omit<StoredPayment, "paid" | "paidAt">,
) {
  return withStore((store) => {
    const current = store.requests[id];
    if (!current) return null;

    const nextPayment: StoredPayment = {
      ...payment,
      paid: false,
      paidAt: 0,
    };

    const nextRecord: ChronicControlRecord = {
      ...current,
      updatedAt: Date.now(),
      payment: {
        ...current.payment,
        pending: nextPayment,
      },
    };

    store.requests[id] = nextRecord;
    return nextRecord;
  });
}

export async function confirmChronicPendingPayment(id: string) {
  return withStore((store) => {
    const current = store.requests[id];
    if (!current || !current.payment.pending) return null;

    const paidAt = Date.now();
    const confirmed: StoredPayment = {
      ...current.payment.pending,
      paid: true,
      paidAt,
    };

    const nextRecord: ChronicControlRecord = {
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

    store.requests[id] = nextRecord;
    return nextRecord;
  });
}

export function serializeChronicControlRecord(record: ChronicControlRecord) {
  const resolved = resolveStatus(record);
  return {
    id: resolved.id,
    createdAt: resolved.createdAt,
    updatedAt: resolved.updatedAt,
    conditions: resolved.conditions,
    patient: resolved.patient,
    yearsSinceDiagnosis: resolved.yearsSinceDiagnosis,
    hasRecentChanges: resolved.hasRecentChanges,
    usesMedication: resolved.usesMedication,
    selectedMedications: resolved.selectedMedications,
    rec: resolved.rec,
    payment: resolved.payment,
    status: resolved.status,
  };
}
