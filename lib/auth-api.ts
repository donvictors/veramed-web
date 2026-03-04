import { type AuthFormPayload, type AuthUser } from "@/lib/auth";

type AuthResponse = {
  user: AuthUser;
};

type MeResponse = {
  authenticated: boolean;
  user: AuthUser | null;
};

type AccountHistoryItem = {
  id: string;
  kind: "chequeo" | "control_cronico";
  title: string;
  patientName: string;
  createdAt: number;
  updatedAt: number;
  status: "queued" | "approved" | "rejected";
  paid: boolean;
  href: string;
  reviewHref: string;
};

type AccountOverviewResponse = {
  user: AuthUser;
  history: AccountHistoryItem[];
};

async function readJson<T>(response: Response) {
  const payload = (await response.json()) as T & { error?: string; details?: string[] };

  if (!response.ok) {
    const message =
      payload.details && payload.details.length > 0
        ? payload.details.join(" ")
        : payload.error || "Error inesperado.";
    throw new Error(message);
  }

  return payload;
}

export async function registerWithEmail(payload: Required<Pick<AuthFormPayload, "name" | "email" | "password">>) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await readJson<AuthResponse>(response);
  return data.user;
}

export async function loginWithEmail(payload: Required<Pick<AuthFormPayload, "email" | "password">>) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await readJson<AuthResponse>(response);
  return data.user;
}

export async function fetchCurrentUser() {
  const response = await fetch("/api/auth/me", {
    cache: "no-store",
  });

  const data = await readJson<MeResponse>(response);
  return data;
}

export async function logoutCurrentUser() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
  });

  await readJson<{ ok: true }>(response);
}

export async function fetchAccountOverview() {
  const response = await fetch("/api/account/overview", {
    cache: "no-store",
  });

  const data = await readJson<AccountOverviewResponse>(response);
  return data;
}
