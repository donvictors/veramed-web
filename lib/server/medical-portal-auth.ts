import { createHmac, timingSafeEqual } from "node:crypto";

type MedicalPortalSessionPayload = {
  email: string;
  iat: number;
  exp: number;
};

export const MEDICAL_PORTAL_SESSION_COOKIE = "veramed_medicos_session";

const SESSION_TTL_SECONDS = 60 * 60 * 12;

function asBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getAuthSecret() {
  const secret =
    process.env.MEDICOS_PORTAL_AUTH_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "";

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error(
      "MEDICOS_PORTAL_AUTH_SECRET no está configurado para producción.",
    );
  }

  return secret || "veramed-medicos-dev-secret";
}

function sign(payloadBase64Url: string) {
  return createHmac("sha256", getAuthSecret()).update(payloadBase64Url).digest("base64url");
}

function getConfiguredDoctorCredentials() {
  const email = (process.env.MEDICOS_PORTAL_EMAIL ?? "").trim().toLowerCase();
  const password = (process.env.MEDICOS_PORTAL_PASSWORD ?? "").trim();

  if (email && password) {
    return { email, password };
  }

  if (process.env.NODE_ENV !== "production") {
    return { email: "medicos@veramed.cl", password: "veramed123" };
  }

  return null;
}

export function validateDoctorCredentials(input: { email: string; password: string }) {
  const credentials = getConfiguredDoctorCredentials();
  if (!credentials) {
    return { ok: false, reason: "Portal médico no configurado." } as const;
  }

  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (email !== credentials.email || password !== credentials.password) {
    return { ok: false, reason: "Credenciales inválidas." } as const;
  }

  return { ok: true, email } as const;
}

export function createMedicalPortalSessionToken(email: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload: MedicalPortalSessionPayload = {
    email: email.trim().toLowerCase(),
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const payloadBase64Url = asBase64Url(JSON.stringify(payload));
  const signature = sign(payloadBase64Url);
  return `${payloadBase64Url}.${signature}`;
}

export function verifyMedicalPortalSessionToken(token?: string | null) {
  if (!token) {
    return null;
  }

  const [payloadBase64Url, signature] = token.split(".");
  if (!payloadBase64Url || !signature) {
    return null;
  }

  const expectedSignature = sign(payloadBase64Url);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadBase64Url)) as MedicalPortalSessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload?.email || typeof payload.exp !== "number" || payload.exp <= now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getMedicalPortalSessionMaxAgeSeconds() {
  return SESSION_TTL_SECONDS;
}
