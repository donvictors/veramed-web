import { createHmac, timingSafeEqual } from "node:crypto";

type RequestType = "checkup" | "chronic_control";

const MAX_AGE_MS = 5 * 60 * 1000;

function getSigningSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET no está configurada para firma interna.");
  }
  return secret;
}

function buildSignaturePayload(input: {
  requestType: RequestType;
  requestId: string;
  ts: number;
}) {
  return `${input.requestType}:${input.requestId}:${input.ts}`;
}

function signPayload(payload: string) {
  const secret = getSigningSecret();
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createInternalAccessParams(input: {
  requestType: RequestType;
  requestId: string;
  nowMs?: number;
}) {
  const ts = input.nowMs ?? Date.now();
  const payload = buildSignaturePayload({
    requestType: input.requestType,
    requestId: input.requestId,
    ts,
  });

  return {
    internalTs: String(ts),
    internalSig: signPayload(payload),
  };
}

export function hasValidInternalAccess(
  request: Request,
  input: {
    requestType: RequestType;
    requestId: string;
  },
) {
  const url = new URL(request.url);
  const tsRaw = url.searchParams.get("internalTs")?.trim();
  const sigRaw = url.searchParams.get("internalSig")?.trim();

  if (!tsRaw || !sigRaw) {
    return false;
  }

  const ts = Number(tsRaw);
  if (!Number.isFinite(ts)) {
    return false;
  }

  if (Math.abs(Date.now() - ts) > MAX_AGE_MS) {
    return false;
  }

  const payload = buildSignaturePayload({
    requestType: input.requestType,
    requestId: input.requestId,
    ts,
  });
  const expected = signPayload(payload);

  const providedBuffer = Buffer.from(sigRaw, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

