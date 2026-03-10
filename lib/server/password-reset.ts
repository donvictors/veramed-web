import { createHmac, timingSafeEqual } from "node:crypto";

type ResetPayload = {
  uid: string;
  exp: number;
  pf: string;
};

const RESET_VERSION = "v1";
const RESET_TTL_MS = 1000 * 60 * 30;

function getSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET no está configurada.");
  }
  return `${secret}:password-reset:${RESET_VERSION}`;
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payloadPart: string) {
  return createHmac("sha256", getSecret()).update(payloadPart).digest("base64url");
}

export function createPasswordResetToken(input: { userId: string; passwordHash: string }) {
  const payload: ResetPayload = {
    uid: input.userId,
    exp: Date.now() + RESET_TTL_MS,
    pf: input.passwordHash.slice(0, 16),
  };
  const payloadPart = toBase64Url(JSON.stringify(payload));
  const signature = sign(payloadPart);
  return `${payloadPart}.${signature}`;
}

export function verifyPasswordResetToken(
  token: string,
  currentPasswordHash: string,
): { ok: true; userId: string } | { ok: false } {
  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature) return { ok: false };

  const expectedSignature = sign(payloadPart);
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSignature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false };
    }
  } catch {
    return { ok: false };
  }

  let payload: ResetPayload;
  try {
    payload = JSON.parse(fromBase64Url(payloadPart)) as ResetPayload;
  } catch {
    return { ok: false };
  }

  if (!payload?.uid || !payload?.exp || !payload?.pf) return { ok: false };
  if (Date.now() > payload.exp) return { ok: false };
  if (payload.pf !== currentPasswordHash.slice(0, 16)) return { ok: false };

  return { ok: true, userId: payload.uid };
}

export function getPasswordResetTtlMs() {
  return RESET_TTL_MS;
}
