import "server-only";

import { OutboxStatusDb, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAutomaticApprovalAttribution } from "@/lib/server/medical-approval";
import { sendApprovedOrderEmail } from "@/lib/server/order-ready-email";

type OrderRequestType = "checkup" | "chronic_control";
type DbClient = Prisma.TransactionClient | typeof prisma;

export async function enqueueOrderApproved(
  client: DbClient,
  requestType: OrderRequestType,
  requestId: string,
) {
  return client.eventOutbox.upsert({
    where: { dedupeKey: `order.approved:${requestType}:${requestId}` },
    create: {
      type: "order.approved",
      aggregateType: requestType,
      aggregateId: requestId,
      dedupeKey: `order.approved:${requestType}:${requestId}`,
      payload: { requestType, requestId },
    },
    update: {},
  });
}

async function processEvent(event: { type: string; aggregateType: string; aggregateId: string }) {
  if (
    event.type === "order.approved" &&
    (event.aggregateType === "checkup" || event.aggregateType === "chronic_control")
  ) {
    await sendApprovedOrderEmail({
      requestType: event.aggregateType,
      requestId: event.aggregateId,
    });
    return;
  }
  throw new Error(`Tipo de evento no soportado: ${event.type}`);
}

export async function processOrderOutbox(input: { maxItems?: number; aggregateId?: string } = {}) {
  const maxItems = Math.max(1, Math.min(input.maxItems ?? 20, 100));
  const now = new Date();
  const staleLockBefore = new Date(now.getTime() - 15 * 60 * 1000);
  const candidates = await prisma.eventOutbox.findMany({
    where: {
      aggregateId: input.aggregateId,
      nextAttemptAt: { lte: now },
      OR: [
        { status: { in: [OutboxStatusDb.pending, OutboxStatusDb.failed] } },
        { status: OutboxStatusDb.processing, lockedAt: { lt: staleLockBefore } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: maxItems,
  });

  let completed = 0;
  let failed = 0;
  for (const candidate of candidates) {
    const claimed = await prisma.eventOutbox.updateMany({
      where: {
        id: candidate.id,
        OR: [
          { status: { in: [OutboxStatusDb.pending, OutboxStatusDb.failed] } },
          { status: OutboxStatusDb.processing, lockedAt: { lt: staleLockBefore } },
        ],
      },
      data: {
        status: OutboxStatusDb.processing,
        lockedAt: new Date(),
        attempts: { increment: 1 },
      },
    });
    if (claimed.count !== 1) continue;

    try {
      await processEvent(candidate);
      await prisma.eventOutbox.update({
        where: { id: candidate.id },
        data: {
          status: OutboxStatusDb.completed,
          processedAt: new Date(),
          lockedAt: null,
          lastError: null,
        },
      });
      completed += 1;
    } catch (error) {
      const attempts = candidate.attempts + 1;
      const delayMs = Math.min(24 * 60 * 60 * 1000, 60_000 * 2 ** Math.min(attempts, 8));
      await prisma.eventOutbox.update({
        where: { id: candidate.id },
        data: {
          status: OutboxStatusDb.failed,
          lockedAt: null,
          lastError: (error instanceof Error ? error.message : "Unknown error").slice(0, 1_000),
          nextAttemptAt: new Date(Date.now() + delayMs),
        },
      });
      failed += 1;
    }
  }

  return { scanned: candidates.length, completed, failed };
}

export async function approveQueuedAutomaticOrders(maxItems = 100) {
  const take = Math.max(1, Math.min(maxItems, 200));
  const [checkups, chronicControls] = await Promise.all([
    prisma.checkupRequest.findMany({
      where: { reviewStatus: "queued", payment: { is: { status: "paid" } } },
      select: { id: true, queuedAt: true },
      orderBy: { queuedAt: "asc" },
      take,
    }),
    prisma.chronicControlRequest.findMany({
      where: { reviewStatus: "queued", payment: { is: { status: "paid" } } },
      select: { id: true, queuedAt: true },
      orderBy: { queuedAt: "asc" },
      take,
    }),
  ]);

  let approved = 0;
  for (const row of checkups) {
    const changed = await prisma.$transaction(async (tx) => {
      const result = await tx.checkupRequest.updateMany({
        where: { id: row.id, reviewStatus: "queued", payment: { is: { status: "paid" } } },
        data: {
          reviewStatus: "approved",
          approvedAt: row.queuedAt ?? new Date(),
          ...getAutomaticApprovalAttribution("checkup"),
        },
      });
      if (result.count === 1) await enqueueOrderApproved(tx, "checkup", row.id);
      return result.count;
    });
    approved += changed;
  }
  for (const row of chronicControls) {
    const changed = await prisma.$transaction(async (tx) => {
      const result = await tx.chronicControlRequest.updateMany({
        where: { id: row.id, reviewStatus: "queued", payment: { is: { status: "paid" } } },
        data: {
          reviewStatus: "approved",
          approvedAt: row.queuedAt ?? new Date(),
          ...getAutomaticApprovalAttribution("chronic_control"),
        },
      });
      if (result.count === 1) await enqueueOrderApproved(tx, "chronic_control", row.id);
      return result.count;
    });
    approved += changed;
  }
  return { scanned: checkups.length + chronicControls.length, approved };
}
