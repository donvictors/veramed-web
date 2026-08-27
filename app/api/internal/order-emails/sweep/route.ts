import { NextResponse } from "next/server";
import {
  sweepPendingOrderEmails,
} from "@/lib/server/order-email-sweeper";
import { approveQueuedAutomaticOrders, processOrderOutbox } from "@/lib/server/order-workflow";

export const runtime = "nodejs";

function parseBoolean(value: string | null, defaultValue = false) {
  if (!value) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "si", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

function parseLimit(value: string | null, defaultValue: number) {
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  return parsed;
}

function getExpectedCronSecret() {
  return process.env.CRON_SECRET?.trim() || process.env.INTERNAL_CRON_TOKEN?.trim() || "";
}

function isRequestAuthorized(request: Request) {
  const supportToken = process.env.INTERNAL_SUPPORT_TOKEN?.trim();
  const providedSupportToken = request.headers.get("x-support-token")?.trim();
  if (supportToken && providedSupportToken && providedSupportToken === supportToken) {
    return true;
  }

  const cronSecret = getExpectedCronSecret();
  const authorization = request.headers.get("authorization")?.trim();
  if (cronSecret && authorization === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "No autorizado. Usa x-support-token o Authorization Bearer con CRON_SECRET/INTERNAL_CRON_TOKEN.",
    },
    { status: 403 },
  );
}

export async function GET(request: Request) {
  if (!isRequestAuthorized(request)) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get("limit"), 20);
  const dryRun = parseBoolean(searchParams.get("dryRun"), false);
  const forceResend = parseBoolean(searchParams.get("forceResend"), false);

  const automaticApprovals = dryRun ? { scanned: 0, approved: 0 } : await approveQueuedAutomaticOrders(limit);
  const outbox = dryRun ? { scanned: 0, completed: 0, failed: 0 } : await processOrderOutbox({ maxItems: limit });
  const result = await sweepPendingOrderEmails({
    maxItems: limit,
    dryRun,
    forceResend,
  });

  return NextResponse.json({ ok: true, automaticApprovals, outbox, ...result });
}

export async function POST(request: Request) {
  if (!isRequestAuthorized(request)) {
    return unauthorizedResponse();
  }

  let payload: {
    limit?: number;
    dryRun?: boolean;
    forceResend?: boolean;
  } = {};
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    payload = {};
  }

  const limit = Number.isFinite(payload.limit) ? Number(payload.limit) : 20;
  const dryRun = Boolean(payload.dryRun);
  const automaticApprovals = dryRun ? { scanned: 0, approved: 0 } : await approveQueuedAutomaticOrders(limit);
  const outbox = dryRun ? { scanned: 0, completed: 0, failed: 0 } : await processOrderOutbox({ maxItems: limit });
  const result = await sweepPendingOrderEmails({
    maxItems: limit,
    dryRun,
    forceResend: Boolean(payload.forceResend),
  });

  return NextResponse.json({ ok: true, automaticApprovals, outbox, ...result });
}
