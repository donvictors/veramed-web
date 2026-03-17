import { put } from "@vercel/blob";
import { OrderPdfCategoryDb } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { type PatientDetails, type TestItem } from "@/lib/checkup";
import { getOrderCategoryByTestName, type OrderCategory } from "@/lib/order-categories";
import { renderOrderPdfFromOrderPage } from "@/lib/server/order-pdf-browser";

type SymptomsPdfAsset = {
  category: OrderCategory;
  fileName: string;
  blobUrl: string;
  blobPath: string;
  sizeBytes: number;
};

const CATEGORY_ORDER: OrderCategory[] = [
  "laboratory",
  "image",
  "procedure",
  "interconsultation",
];
const CURRENT_RENDER_VERSION = "v2";

function isMissingPdfAssetStoreError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeCode = (error as { code?: unknown }).code;
  if (typeof maybeCode === "string" && (maybeCode === "P2021" || maybeCode === "P2022")) {
    return true;
  }
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.includes("SymptomsOrderPdfAsset");
}

function getCategoryLabel(category: OrderCategory) {
  if (category === "interconsultation") return "interconsulta";
  if (category === "image") return "imagenes";
  if (category === "procedure") return "procedimientos";
  return "laboratorio";
}

function groupTestsByCategory(tests: TestItem[]) {
  const grouped = new Map<OrderCategory, TestItem[]>([
    ["laboratory", []],
    ["image", []],
    ["procedure", []],
    ["interconsultation", []],
  ]);

  for (const test of tests) {
    const category = getOrderCategoryByTestName(test.name);
    grouped.get(category)?.push(test);
  }

  return CATEGORY_ORDER.filter((category) => (grouped.get(category)?.length ?? 0) > 0).map(
    (category) => ({
      category,
      tests: grouped.get(category) ?? [],
    }),
  );
}

export async function ensureSymptomsSignedPdfAssets(input: {
  requestId: string;
  patient: PatientDetails;
  tests: TestItem[];
  issuedAtMs: number;
}) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN no está configurada.");
  }

  const grouped = groupTestsByCategory(input.tests);
  if (grouped.length === 0) return [];

  const assets: SymptomsPdfAsset[] = [];

  for (const group of grouped) {
    const fileName = `orden-symptoms-${input.requestId}-${getCategoryLabel(group.category)}.pdf`;
    const blobPath = `ordenes/${CURRENT_RENDER_VERSION}/signed/symptoms/${input.requestId}/${getCategoryLabel(
      group.category,
    )}-${input.issuedAtMs}.pdf`;
    let buffer: Buffer;
    try {
      buffer = await renderOrderPdfFromOrderPage({
        requestType: "symptoms",
        requestId: input.requestId,
        category: group.category,
      });
    } catch (error) {
      console.error("No pudimos renderizar PDF firmado de síntomas con motor visual", {
        requestId: input.requestId,
        category: group.category,
        error,
      });
      throw error;
    }

    const blob = await put(blobPath, buffer, {
      access: "public",
      contentType: "application/pdf",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    try {
      await prisma.symptomsOrderPdfAsset.upsert({
        where: {
          requestId_category: {
            requestId: input.requestId,
            category: group.category as unknown as OrderPdfCategoryDb,
          },
        },
        update: {
          fileName,
          blobUrl: blob.url,
          blobPath: blob.pathname,
          sizeBytes: buffer.byteLength,
        },
        create: {
          requestId: input.requestId,
          category: group.category as unknown as OrderPdfCategoryDb,
          fileName,
          blobUrl: blob.url,
          blobPath: blob.pathname,
          sizeBytes: buffer.byteLength,
        },
      });
    } catch (error) {
      console.error("No pudimos persistir metadata de PDF firmado de síntomas", {
        requestId: input.requestId,
        category: group.category,
        error,
      });
    }

    assets.push({
      category: group.category,
      fileName,
      blobUrl: blob.url,
      blobPath: blob.pathname,
      sizeBytes: buffer.byteLength,
    });
  }

  return assets.sort(
    (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
  );
}

export async function listSymptomsSignedPdfAssets(requestId: string) {
  let rows: Awaited<ReturnType<typeof prisma.symptomsOrderPdfAsset.findMany>>;
  try {
    rows = await prisma.symptomsOrderPdfAsset.findMany({
      where: { requestId },
    });
  } catch (error) {
    if (isMissingPdfAssetStoreError(error)) {
      console.warn("SymptomsOrderPdfAsset no disponible, continuamos sin assets firmados", {
        requestId,
      });
      return [];
    }
    throw error;
  }

  return rows
    .map((row) => ({
      category: row.category as unknown as OrderCategory,
      fileName: row.fileName,
      blobUrl: row.blobUrl,
      blobPath: row.blobPath,
      sizeBytes: row.sizeBytes,
    }))
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
}
