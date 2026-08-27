import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { get } from "@vercel/blob";
import {
  ClinicalRequestTypeDb,
  OrderPdfAccessOutcomeDb,
  OrderPdfCategoryDb,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/server/transbank/config";
import {
  requireApprovedMedicalSigner,
  type ClinicalRequestType,
} from "@/lib/server/medical-approval";
import type { OrderCategory } from "@/lib/order-categories";

const MAX_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_LINK_TTL_MS = MAX_LINK_TTL_MS;

export type PrivatePdfAsset = {
  requestId: string;
  category: OrderCategory;
  fileName: string;
  blobPath: string;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function toDbRequestType(value: ClinicalRequestType) {
  return value as ClinicalRequestTypeDb;
}

function clampTtl(ttlMs?: number) {
  if (!ttlMs || !Number.isFinite(ttlMs)) return DEFAULT_LINK_TTL_MS;
  return Math.max(60_000, Math.min(MAX_LINK_TTL_MS, Math.round(ttlMs)));
}

function getClientIpHash(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwarded || realIp;
  return ip ? sha256(ip) : null;
}

async function recordAccess(
  linkId: string,
  outcome: OrderPdfAccessOutcomeDb,
  request: Request,
) {
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) || null;
  try {
    const accessLog = prisma.orderPdfAccessLog.create({
      data: {
        linkId,
        outcome,
        ipHash: getClientIpHash(request),
        userAgent,
      },
    });
    if (outcome === "granted") {
      await prisma.$transaction([
        accessLog,
        prisma.orderPdfAccessLink.update({
          where: { id: linkId },
          data: { lastAccessedAt: new Date() },
        }),
      ]);
    } else {
      await accessLog;
    }
  } catch (error) {
    console.error("No pudimos registrar acceso a PDF privado", { linkId, outcome, error });
  }
}

export async function createTemporaryPdfAccessLink(input: {
  requestType: ClinicalRequestType;
  asset: PrivatePdfAsset;
  purpose: "email" | "patient" | "medical_portal" | "internal";
  recipientKey?: string;
  ttlMs?: number;
}) {
  await requireApprovedMedicalSigner(input.requestType, input.asset.requestId);

  if (!input.asset.blobPath.startsWith("private/")) {
    throw new Error("El PDF todavía no ha sido migrado a almacenamiento privado.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + clampTtl(input.ttlMs));
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = sha256(rawToken);
  const recipientKeyHash = input.recipientKey
    ? sha256(input.recipientKey.trim().toLowerCase())
    : null;
  const requestType = toDbRequestType(input.requestType);
  const category = input.asset.category as OrderPdfCategoryDb;

  const link = await prisma.$transaction(async (tx) => {
    await tx.orderPdfAccessLink.updateMany({
      where: {
        requestType,
        requestId: input.asset.requestId,
        category,
        purpose: input.purpose,
        recipientKeyHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        revokedAt: now,
        revokedReason: "superseded",
      },
    });

    return tx.orderPdfAccessLink.create({
      data: {
        tokenHash,
        requestType,
        requestId: input.asset.requestId,
        category,
        blobPath: input.asset.blobPath,
        fileName: input.asset.fileName,
        purpose: input.purpose,
        recipientKeyHash,
        expiresAt,
      },
    });
  });

  return {
    id: link.id,
    url: `${getAppUrl()}/api/orders/download?token=${encodeURIComponent(rawToken)}`,
    expiresAt: link.expiresAt.getTime(),
  };
}

export async function createTemporaryPdfAccessLinks(input: {
  requestType: ClinicalRequestType;
  assets: PrivatePdfAsset[];
  purpose: "email" | "patient" | "medical_portal" | "internal";
  recipientKey?: string;
  ttlMs?: number;
}) {
  return Promise.all(
    input.assets.map(async (asset) => ({
      ...asset,
      ...(await createTemporaryPdfAccessLink({
        requestType: input.requestType,
        asset,
        purpose: input.purpose,
        recipientKey: input.recipientKey,
        ttlMs: input.ttlMs,
      })),
    })),
  );
}

export async function revokePdfAccessLinks(input: {
  requestType: ClinicalRequestType;
  requestId: string;
  reason?: string;
}) {
  return prisma.orderPdfAccessLink.updateMany({
    where: {
      requestType: toDbRequestType(input.requestType),
      requestId: input.requestId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedReason: input.reason?.trim().slice(0, 200) || "manual",
    },
  });
}

export async function openPrivatePdfAccess(rawToken: string, request: Request) {
  const token = rawToken.trim();
  if (!token || token.length > 200) {
    return { ok: false as const, status: 404 as const, error: "Enlace no encontrado." };
  }

  const link = await prisma.orderPdfAccessLink.findUnique({
    where: { tokenHash: sha256(token) },
  });
  if (!link) {
    return { ok: false as const, status: 404 as const, error: "Enlace no encontrado." };
  }

  if (link.revokedAt) {
    await recordAccess(link.id, OrderPdfAccessOutcomeDb.revoked, request);
    return { ok: false as const, status: 410 as const, error: "Este enlace fue revocado." };
  }

  if (link.expiresAt.getTime() <= Date.now()) {
    await recordAccess(link.id, OrderPdfAccessOutcomeDb.expired, request);
    return { ok: false as const, status: 410 as const, error: "Este enlace expiró." };
  }

  const requestType = link.requestType as ClinicalRequestType;
  const signer = await requireApprovedMedicalSigner(requestType, link.requestId).catch(() => null);
  if (!signer) {
    await recordAccess(link.id, OrderPdfAccessOutcomeDb.revoked, request);
    return {
      ok: false as const,
      status: 403 as const,
      error: "La orden ya no está autorizada para descarga.",
    };
  }

  try {
    const privateBlobToken = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN?.trim();
    if (!privateBlobToken) {
      throw new Error("PRIVATE_BLOB_READ_WRITE_TOKEN no está configurada.");
    }
    const blob = await get(link.blobPath, {
      access: "private",
      useCache: false,
      token: privateBlobToken,
    });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      await recordAccess(link.id, OrderPdfAccessOutcomeDb.not_found, request);
      return { ok: false as const, status: 404 as const, error: "PDF no encontrado." };
    }

    await recordAccess(link.id, OrderPdfAccessOutcomeDb.granted, request);
    return {
      ok: true as const,
      stream: blob.stream,
      fileName: link.fileName,
      contentType: blob.blob.contentType || "application/pdf",
    };
  } catch (error) {
    await recordAccess(link.id, OrderPdfAccessOutcomeDb.storage_error, request);
    console.error("No pudimos leer PDF privado", { linkId: link.id, error });
    return {
      ok: false as const,
      status: 502 as const,
      error: "No pudimos recuperar el PDF en este momento.",
    };
  }
}
