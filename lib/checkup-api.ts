import {
  type CheckupInput,
  type PatientDetails,
  type StoredCheckup,
  type StoredCheckupStatus,
  type StoredPayment,
} from "@/lib/checkup";

export type CheckupApiRecord = StoredCheckup & {
  id: string;
  createdAt: number;
  updatedAt: number;
  payment: {
    pending: StoredPayment | null;
    confirmed: StoredPayment | null;
  };
  status: StoredCheckupStatus;
};

async function readJson<T>(response: Response) {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || "Error inesperado.");
  }
  return payload;
}

export async function createCheckupRequest(payload: {
  input: CheckupInput;
  patient: PatientDetails;
}) {
  const response = await fetch("/api/checkups", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await readJson<{ checkup: CheckupApiRecord }>(response);
  return data.checkup;
}

export async function fetchCheckupRequest(id: string) {
  const response = await fetch(`/api/checkups/${id}`, {
    cache: "no-store",
  });

  const data = await readJson<{ checkup: CheckupApiRecord }>(response);
  return data.checkup;
}

export async function createCheckupPendingPayment(
  id: string,
  payment: Omit<StoredPayment, "paid" | "paidAt">,
) {
  const response = await fetch(`/api/checkups/${id}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payment }),
  });

  const data = await readJson<{ checkup: CheckupApiRecord }>(response);
  return data.checkup;
}

export async function confirmCheckupPayment(id: string) {
  const response = await fetch(`/api/checkups/${id}/payments/confirm`, {
    method: "POST",
  });

  const data = await readJson<{ checkup: CheckupApiRecord }>(response);
  return data.checkup;
}
