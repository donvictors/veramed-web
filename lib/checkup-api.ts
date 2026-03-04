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
  const raw = await response.text();

  if (!raw.trim()) {
    throw new Error(
      response.ok
        ? "El servidor devolvió una respuesta vacía."
        : "No pudimos procesar tu solicitud en este momento.",
    );
  }

  let payload: (T & { error?: string }) | null = null;

  try {
    payload = JSON.parse(raw) as T & { error?: string };
  } catch {
    throw new Error("El servidor devolvió una respuesta no válida.");
  }

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

export type CheckupScreeningPreferences = {
  colorectalMethod?: "fit" | "colonoscopy";
  cervicalMethod?: "pap" | "hpv" | "cotesting";
  bloodPressureMethod?: "mapa" | "skip";
  breastImaging?: "mammo_only" | "mammo_plus_ultrasound";
  prostateMethod?: "include" | "skip";
  addTestName?: string;
  removeTestName?: string;
  restoreTestName?: string;
};

export async function updateCheckupScreeningPreferences(
  id: string,
  preferences: CheckupScreeningPreferences,
) {
  const response = await fetch(`/api/checkups/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preferences),
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
