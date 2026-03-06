import { createHmac, timingSafeEqual } from "node:crypto";

type RequestType = "checkup" | "chronic_control";

type RequestAccessCookieState = {
  v: 1;
  entries: Array<{
    k: string;
    t: string;
  }>;
};

const REQUEST_ACCESS_COOKIE = "veramed_request_access";
const REQUEST_ACCESS_VERSION = "v1";
const REQUEST_ACCESS_MAX_ENTRIES = 40;
const TOKEN_HEX_LENGTH = 64;

function getSigningSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET no está configurada para control de acceso por solicitud.");
  }
  return secret;
}

function buildPayload(input: { requestType: RequestType; requestId: string; createdAtMs: number }) {
  return `${REQUEST_ACCESS_VERSION}:${input.requestType}:${input.requestId}:${input.createdAtMs}`;
}

function buildKey(input: { requestType: RequestType; requestId: string }) {
  return `${input.requestType}:${input.requestId}`;
}

function parseCookie(raw: string | undefined): RequestAccessCookieState {
  if (!raw) {
    return { v: 1, entries: [] };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RequestAccessCookieState> | null;
    if (
      !parsed ||
      parsed.v !== 1 ||
      !Array.isArray(parsed.entries) ||
      parsed.entries.some(
        (entry) =>
          !entry ||
          typeof entry !== "object" ||
          typeof (entry as { k?: unknown }).k !== "string" ||
          typeof (entry as { t?: unknown }).t !== "string",
      )
    ) {
      return { v: 1, entries: [] };
    }

    return {
      v: 1,
      entries: parsed.entries as Array<{ k: string; t: string }>,
    };
  } catch {
    return { v: 1, entries: [] };
  }
}

export function getRequestAccessCookieName() {
  return REQUEST_ACCESS_COOKIE;
}

export function createRequestAccessToken(input: {
  requestType: RequestType;
  requestId: string;
  createdAtMs: number;
}) {
  const payload = buildPayload(input);
  return createHmac("sha256", getSigningSecret()).update(payload).digest("hex");
}

export function isRequestAccessTokenValid(
  providedToken: string | undefined,
  input: {
    requestType: RequestType;
    requestId: string;
    createdAtMs: number;
  },
) {
  if (!providedToken || providedToken.length !== TOKEN_HEX_LENGTH) {
    return false;
  }

  const expected = createRequestAccessToken(input);
  if (expected.length !== providedToken.length) {
    return false;
  }

  try {
    const expectedBuffer = Buffer.from(expected, "hex");
    const providedBuffer = Buffer.from(providedToken, "hex");
    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }
    return timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}

export function getRequestAccessTokenFromCookie(
  rawCookie: string | undefined,
  input: { requestType: RequestType; requestId: string },
) {
  const key = buildKey(input);
  const state = parseCookie(rawCookie);
  const entry = state.entries.find((item) => item.k === key);
  return entry?.t;
}

export function hasValidRequestAccessCookie(
  rawCookie: string | undefined,
  input: {
    requestType: RequestType;
    requestId: string;
    createdAtMs: number;
  },
) {
  const token = getRequestAccessTokenFromCookie(rawCookie, {
    requestType: input.requestType,
    requestId: input.requestId,
  });

  return isRequestAccessTokenValid(token, input);
}

export function upsertRequestAccessCookie(
  rawCookie: string | undefined,
  input: {
    requestType: RequestType;
    requestId: string;
    createdAtMs: number;
  },
) {
  const key = buildKey(input);
  const token = createRequestAccessToken(input);
  const state = parseCookie(rawCookie);
  const filtered = state.entries.filter((entry) => entry.k !== key);
  filtered.push({ k: key, t: token });

  while (filtered.length > REQUEST_ACCESS_MAX_ENTRIES) {
    filtered.shift();
  }

  return JSON.stringify({
    v: 1,
    entries: filtered,
  } satisfies RequestAccessCookieState);
}
