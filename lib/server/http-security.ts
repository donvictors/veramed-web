import "server-only";

import { createHash, createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export class HttpRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly headers?: Record<string, string>,
  ) {
    super(message);
  }
}

export async function readJsonBody(request: Request, maxBytes = 32_768): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new HttpRequestError("El cuerpo de la solicitud es demasiado grande.", 413);
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > maxBytes) {
    throw new HttpRequestError("El cuerpo de la solicitud es demasiado grande.", 413);
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpRequestError("Body JSON inválido.", 400);
  }
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const expectedOrigin = forwardedHost
    ? `${forwardedProto || requestUrl.protocol.replace(":", "")}://${forwardedHost}`
    : requestUrl.origin;

  if (origin !== expectedOrigin) {
    throw new HttpRequestError("Origen no autorizado.", 403);
  }
}

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function securityHash(value: string) {
  const secret =
    process.env.RATE_LIMIT_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "veramed-rate-limit-v1";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function getRequestIpHash(request: Request) {
  return securityHash(`ip:${clientIp(request)}`);
}

export function hashOpaqueToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function enforceRateLimit(input: {
  request: Request;
  action: string;
  limit: number;
  windowMs: number;
  subject?: string;
}) {
  const nowMs = Date.now();
  const windowStartMs = Math.floor(nowMs / input.windowMs) * input.windowMs;
  const windowStart = new Date(windowStartMs);
  const resetAt = new Date(windowStartMs + input.windowMs);
  const subject = input.subject?.trim().toLowerCase() || clientIp(input.request);
  const keyHash = securityHash(`${input.action}:${subject}`);

  const bucket = await prisma.rateLimitBucket.upsert({
    where: {
      keyHash_action_windowStart: {
        keyHash,
        action: input.action,
        windowStart,
      },
    },
    create: {
      keyHash,
      action: input.action,
      windowStart,
      expiresAt: new Date(resetAt.getTime() + input.windowMs),
    },
    update: {
      count: { increment: 1 },
    },
    select: { count: true },
  });

  if (bucket.count > input.limit) {
    const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - nowMs) / 1000));
    throw new HttpRequestError("Demasiados intentos. Intenta nuevamente más tarde.", 429, {
      "Retry-After": String(retryAfter),
    });
  }

  return {
    remaining: Math.max(0, input.limit - bucket.count),
    resetAt,
  };
}

export function httpErrorResponse(error: unknown, fallback: string) {
  if (error instanceof HttpRequestError) {
    const headers = { "Cache-Control": "no-store", ...error.headers };
    return NextResponse.json({ error: error.message }, { status: error.status, headers });
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}
