import { NextResponse } from "next/server";
import { ClinicalRequestTypeDb } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revokePdfAccessLinks } from "@/lib/server/order-pdf-access";
import type { ClinicalRequestType } from "@/lib/server/medical-approval";

function isAuthorized(request: Request) {
  const expected = process.env.INTERNAL_SUPPORT_TOKEN?.trim();
  const provided = request.headers.get("x-support-token")?.trim();
  return Boolean(expected && provided && expected === provided);
}

function isRequestType(value: string): value is ClinicalRequestType {
  return value === "checkup" || value === "chronic_control" || value === "symptoms";
}

function parseTarget(request: Request) {
  const params = new URL(request.url).searchParams;
  const requestType = params.get("requestType")?.trim() ?? "";
  const requestId = params.get("requestId")?.trim() ?? "";
  if (!isRequestType(requestType) || !requestId) return null;
  return { requestType, requestId };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const target = parseTarget(request);
  if (!target) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const links = await prisma.orderPdfAccessLink.findMany({
    where: {
      requestType: target.requestType as ClinicalRequestTypeDb,
      requestId: target.requestId,
    },
    include: {
      accessLogs: {
        orderBy: { accessedAt: "desc" },
        take: 100,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    requestType: target.requestType,
    requestId: target.requestId,
    links: links.map((link) => ({
      id: link.id,
      category: link.category,
      purpose: link.purpose,
      expiresAt: link.expiresAt.getTime(),
      revokedAt: link.revokedAt?.getTime() ?? null,
      revokedReason: link.revokedReason,
      createdAt: link.createdAt.getTime(),
      lastAccessedAt: link.lastAccessedAt?.getTime() ?? null,
      accesses: link.accessLogs.map((log) => ({
        outcome: log.outcome,
        ipHash: log.ipHash,
        userAgent: log.userAgent,
        accessedAt: log.accessedAt.getTime(),
      })),
    })),
  });
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const target = parseTarget(request);
  if (!target) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const result = await revokePdfAccessLinks({
    ...target,
    reason: "support_revocation",
  });
  return NextResponse.json({ ok: true, revoked: result.count });
}
