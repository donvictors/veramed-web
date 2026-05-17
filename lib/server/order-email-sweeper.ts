import { prisma } from "@/lib/prisma";
import { sendApprovedOrderEmail } from "@/lib/server/order-ready-email";

type RequestType = "checkup" | "chronic_control";

type PendingRequest = {
  requestType: RequestType;
  requestId: string;
  patientEmail: string;
  priorityAtMs: number;
};

type SweepEmailOptions = {
  maxItems: number;
  forceResend: boolean;
  dryRun: boolean;
};

type SweptItem = {
  requestType: RequestType;
  requestId: string;
  patientEmail: string;
  status: "sent" | "deduped";
  messageId: string | null;
  pdfCount: number;
};

type SweepErrorItem = {
  requestType: RequestType;
  requestId: string;
  patientEmail: string;
  error: string;
};

export type SweepOrderEmailsResult = {
  queuedAt: string;
  options: SweepEmailOptions;
  pendingCounts: {
    checkup: number;
    chronicControl: number;
    total: number;
  };
  scanned: number;
  attempted: number;
  sent: number;
  deduped: number;
  failed: number;
  processed: SweptItem[];
  errors: SweepErrorItem[];
};

function toPriorityTimestamp(value: {
  approvedAt: Date | null;
  queuedAt: Date | null;
  updatedAt: Date;
}) {
  return value.approvedAt?.getTime() ?? value.queuedAt?.getTime() ?? value.updatedAt.getTime();
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Error desconocido al intentar enviar correo.";
}

export async function sweepPendingOrderEmails(
  options: Partial<SweepEmailOptions> = {},
): Promise<SweepOrderEmailsResult> {
  const maxItems = Number.isFinite(options.maxItems)
    ? Math.min(Math.max(Math.trunc(options.maxItems ?? 20), 1), 200)
    : 20;
  const forceResend = Boolean(options.forceResend);
  const dryRun = Boolean(options.dryRun);

  const [checkupPendingCount, chronicPendingCount] = await Promise.all([
    prisma.checkupRequest.count({
      where: {
        reviewStatus: "approved",
        orderEmailSentAt: null,
        payment: {
          is: { status: "paid" },
        },
      },
    }),
    prisma.chronicControlRequest.count({
      where: {
        reviewStatus: "approved",
        orderEmailSentAt: null,
        payment: {
          is: { status: "paid" },
        },
      },
    }),
  ]);

  const [checkups, chronicControls] = await Promise.all([
    prisma.checkupRequest.findMany({
      where: {
        reviewStatus: "approved",
        orderEmailSentAt: null,
        payment: {
          is: { status: "paid" },
        },
      },
      orderBy: [{ approvedAt: "asc" }, { updatedAt: "asc" }],
      take: maxItems,
      select: {
        id: true,
        patientEmail: true,
        approvedAt: true,
        queuedAt: true,
        updatedAt: true,
      },
    }),
    prisma.chronicControlRequest.findMany({
      where: {
        reviewStatus: "approved",
        orderEmailSentAt: null,
        payment: {
          is: { status: "paid" },
        },
      },
      orderBy: [{ approvedAt: "asc" }, { updatedAt: "asc" }],
      take: maxItems,
      select: {
        id: true,
        patientEmail: true,
        approvedAt: true,
        queuedAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const pending: PendingRequest[] = [
    ...checkups.map((row) => ({
      requestType: "checkup" as const,
      requestId: row.id,
      patientEmail: row.patientEmail,
      priorityAtMs: toPriorityTimestamp(row),
    })),
    ...chronicControls.map((row) => ({
      requestType: "chronic_control" as const,
      requestId: row.id,
      patientEmail: row.patientEmail,
      priorityAtMs: toPriorityTimestamp(row),
    })),
  ]
    .sort((a, b) => a.priorityAtMs - b.priorityAtMs)
    .slice(0, maxItems);

  const processed: SweptItem[] = [];
  const errors: SweepErrorItem[] = [];

  if (!dryRun) {
    for (const item of pending) {
      try {
        const result = await sendApprovedOrderEmail({
          requestType: item.requestType,
          requestId: item.requestId,
          forceResend,
        });

        processed.push({
          requestType: item.requestType,
          requestId: item.requestId,
          patientEmail: item.patientEmail,
          status: result.deduped ? "deduped" : "sent",
          messageId: result.messageId ?? null,
          pdfCount: result.pdfAssets.length,
        });
      } catch (error) {
        errors.push({
          requestType: item.requestType,
          requestId: item.requestId,
          patientEmail: item.patientEmail,
          error: toErrorMessage(error),
        });
      }
    }
  }

  const sent = processed.filter((item) => item.status === "sent").length;
  const deduped = processed.filter((item) => item.status === "deduped").length;

  return {
    queuedAt: new Date().toISOString(),
    options: {
      maxItems,
      forceResend,
      dryRun,
    },
    pendingCounts: {
      checkup: checkupPendingCount,
      chronicControl: chronicPendingCount,
      total: checkupPendingCount + chronicPendingCount,
    },
    scanned: pending.length,
    attempted: dryRun ? 0 : pending.length,
    sent,
    deduped,
    failed: errors.length,
    processed,
    errors,
  };
}
