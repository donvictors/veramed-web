import { PrismaClient } from "@prisma/client";
import { del, put } from "@vercel/blob";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function deletePublicBlob(url, label) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await wait(1_000 * attempt);
    }
  }
  throw new Error(
    `No se pudo eliminar el Blob público ${label}: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

async function verifyPublicUrlsAreGone(urls) {
  let pending = [...urls];
  for (let attempt = 1; attempt <= 7 && pending.length > 0; attempt += 1) {
    const checks = await Promise.all(
      pending.map(async (url) => {
        try {
          const separator = url.includes("?") ? "&" : "?";
          const response = await fetch(`${url}${separator}migration_check=${Date.now()}-${attempt}`, {
            cache: "no-store",
          });
          return response.ok ? url : null;
        } catch {
          return null;
        }
      }),
    );
    pending = checks.filter(Boolean);
    if (pending.length > 0 && attempt < 7) await wait(10_000);
  }
  return { gone: urls.length - pending.length, reachable: pending.length };
}

async function copyAsset(row, kind) {
  if (row.blobPath.startsWith("private/")) {
    return { status: "already_private" };
  }

  const newPath = `private/${row.blobPath.replace(/^\/+/, "")}`;
  if (dryRun) {
    return { status: "would_migrate", newPath };
  }

  const source = await fetch(row.blobUrl, { cache: "no-store" });
  if (!source.ok || !source.body) {
    throw new Error(`No se encontró el Blob público para ${kind}:${row.id}`);
  }
  const bytes = Buffer.from(await source.arrayBuffer());
  const target = await put(newPath, bytes, {
    access: "private",
    contentType: "application/pdf",
    addRandomSuffix: false,
    allowOverwrite: true,
    token: process.env.PRIVATE_BLOB_READ_WRITE_TOKEN,
  });

  if (kind === "order") {
    await prisma.orderPdfAsset.update({
      where: { id: row.id },
      data: { blobUrl: target.url, blobPath: target.pathname, sizeBytes: bytes.byteLength },
    });
    await prisma.orderPdfAccessLink.updateMany({
      where: { requestType: row.requestType, requestId: row.requestId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: "storage_migration" },
    });
  } else {
    await prisma.symptomsOrderPdfAsset.update({
      where: { id: row.id },
      data: { blobUrl: target.url, blobPath: target.pathname, sizeBytes: bytes.byteLength },
    });
    await prisma.orderPdfAccessLink.updateMany({
      where: { requestType: "symptoms", requestId: row.requestId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: "storage_migration" },
    });
  }

  await deletePublicBlob(row.blobUrl, `${kind}:${row.id}`);
  return { status: "migrated", newPath: target.pathname };
}

try {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN público no está configurada.");
  }
  if (!dryRun && !process.env.PRIVATE_BLOB_READ_WRITE_TOKEN) {
    throw new Error("PRIVATE_BLOB_READ_WRITE_TOKEN no está configurada.");
  }
  const [orders, symptoms] = await Promise.all([
    prisma.orderPdfAsset.findMany(),
    prisma.symptomsOrderPdfAsset.findMany(),
  ]);
  const rows = [
    ...orders.map((row) => ({ kind: "order", row })),
    ...symptoms.map((row) => ({ kind: "symptoms", row })),
  ];
  const legacyPublicUrls = rows
    .filter((item) => !item.row.blobPath.startsWith("private/"))
    .map((item) => item.row.blobUrl);
  const summary = { migrated: 0, alreadyPrivate: 0, wouldMigrate: 0, failed: 0 };

  for (const item of rows) {
    try {
      const result = await copyAsset(item.row, item.kind);
      if (result.status === "migrated") summary.migrated += 1;
      if (result.status === "already_private") summary.alreadyPrivate += 1;
      if (result.status === "would_migrate") summary.wouldMigrate += 1;
    } catch (error) {
      summary.failed += 1;
      console.error(error instanceof Error ? error.message : error);
    }
  }

  const publicUrlVerification = dryRun
    ? { gone: 0, reachable: legacyPublicUrls.length, skipped: true }
    : { ...(await verifyPublicUrlsAreGone(legacyPublicUrls)), skipped: false };

  console.log(
    JSON.stringify({ dryRun, total: rows.length, ...summary, publicUrlVerification }, null, 2),
  );
  if (summary.failed > 0 || (!dryRun && publicUrlVerification.reachable > 0)) {
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}
