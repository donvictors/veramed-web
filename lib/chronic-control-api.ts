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

export async function fetchChronicControlRequest(
  id: string,
  options?: {
    internalTs?: string;
    internalSig?: string;
  },
) {
  const searchParams = new URLSearchParams();
  if (options?.internalTs && options?.internalSig) {
    searchParams.set("internalTs", options.internalTs);
    searchParams.set("internalSig", options.internalSig);
  }

  const suffix = searchParams.toString();
  const response = await fetch(`/api/chronic-controls/${id}${suffix ? `?${suffix}` : ""}`, {
    cache: "no-store",
  });

  const data = await readJson<{ request: ChronicControlApiRecord }>(response);
  return data.request;
}

export type ChronicControlScreeningPreferences = {
  colorectalMethod?: "fit" | "colonoscopy";
  cervicalMethod?: "pap" | "hpv" | "cotesting";
  bloodPressureMethod?: "mapa" | "skip";
  breastImaging?: "mammo_only" | "mammo_plus_ultrasound";
  prostateMethod?: "include" | "skip";
  addTestName?: string;
  removeTestName?: string;
  restoreTestName?: string;
};

export async function updateChronicControlScreeningPreferences(
  id: string,
  preferences: ChronicControlScreeningPreferences,
) {
  const response = await fetch(`/api/chronic-controls/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preferences),
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
