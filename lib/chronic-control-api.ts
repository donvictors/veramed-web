import { type StoredPayment } from "@/lib/checkup";
import { type StoredChronicControl } from "@/lib/chronic-control";

export type ChronicControlApiRecord = StoredChronicControl & {
  id: string;
  createdAt: number;
  updatedAt: number;
  payment: {
    pending: StoredPayment | null;
    confirmed: StoredPayment | null;
  };
  status: {
    status: "queued" | "approved" | "rejected";
    queuedAt?: number;
    approvedAt?: number;
    rejectedAt?: number;
    orderId?: string;
  };
};

async function readJson<T>(response: Response) {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "Error inesperado.");
  }
  return payload;
}

export async function createChronicControlRequest(payload: Omit<StoredChronicControl, "rec">) {
  const response = await fetch("/api/chronic-controls", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await readJson<{ request: ChronicControlApiRecord }>(response);
  return data.request;
}

export async function fetchChronicControlRequest(id: string) {
  const response = await fetch(`/api/chronic-controls/${id}`, {
    cache: "no-store",
  });

  const data = await readJson<{ request: ChronicControlApiRecord }>(response);
  return data.request;
}

export async function createChronicPendingPayment(
  id: string,
  payment: Omit<StoredPayment, "paid" | "paidAt">,
) {
  const response = await fetch(`/api/chronic-controls/${id}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payment }),
  });

  const data = await readJson<{ request: ChronicControlApiRecord }>(response);
  return data.request;
}

export async function confirmChronicPayment(id: string) {
  const response = await fetch(`/api/chronic-controls/${id}/payments/confirm`, {
    method: "POST",
  });

  const data = await readJson<{ request: ChronicControlApiRecord }>(response);
  return data.request;
}
