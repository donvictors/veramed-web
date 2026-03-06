import { put } from "@vercel/blob";
import { OrderPdfCategoryDb, TransbankRequestTypeDb } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { type PatientDetails, type TestItem } from "@/lib/checkup";
import { getOrderCategoryByTestName, type OrderCategory } from "@/lib/order-categories";
import { buildOrderPdf } from "@/lib/server/order-pdf";
import { renderOrderPdfFromOrderPage } from "@/lib/server/order-pdf-browser";

type RequestType = "checkup" | "chronic_control";
type OrderPdfCategory = OrderCategory;

type EnsureOrderPdfAssetsInput = {
  requestType: RequestType;
  requestId: string;
  patient: PatientDetails;
  tests: TestItem[];
  issuedAtMs: number;
  forceRegenerate?: boolean;
};

type StoredOrderPdfAsset = {
  requestType: RequestType;
  requestId: string;
  category: OrderPdfCategory;
  fileName: string;
  blobUrl: string;
  blobPath: string;
  sizeBytes: number;
  renderEngine?: "chromium" | "pdf-lib" | "existing";
  renderError?: string | null;
};

const CATEGORY_ORDER: OrderPdfCategory[] = [
  "laboratory",
  "image",
  "procedure",
  "interconsultation",
];
const CURRENT_RENDER_VERSION = "v2";

function toDbRequestType(value: RequestType): TransbankRequestTypeDb {
  return value === "checkup"
    ? TransbankRequestTypeDb.checkup
    : TransbankRequestTypeDb.chronic_control;
}

function fromDbRequestType(value: TransbankRequestTypeDb): RequestType {
  return value === TransbankRequestTypeDb.checkup ? "checkup" : "chronic_control";
}

function toDbCategory(value: OrderPdfCategory): OrderPdfCategoryDb {
  return value as unknown as OrderPdfCategoryDb;
}

function fromDbCategory(value: OrderPdfCategoryDb): OrderPdfCategory {
  const raw = String(value);
  if (raw === "image") return "image";
  if (raw === "procedure") return "procedure";
  if (raw === "interconsultation") return "interconsultation";
  return "laboratory";
}

function classifyCheckupTest(name: string): OrderPdfCategory {
  return getOrderCategoryByTestName(name);
}

function getTitleForCategory(category: OrderPdfCategory) {
  if (category === "interconsultation") return "ORDEN DE DERIVACIÓN";
  if (category === "image") return "ORDEN DE IMÁGENES";
  if (category === "procedure") return "ORDEN DE PROCEDIMIENTOS";
  return "ORDEN DE LABORATORIO";
}

function getCategoryLabel(category: OrderPdfCategory) {
  if (category === "interconsultation") return "interconsulta";
  if (category === "image") return "imagenes";
  if (category === "procedure") return "procedimientos";
  return "laboratorio";
}

function getTargetCategories(input: EnsureOrderPdfAssetsInput): Map<OrderPdfCategory, TestItem[]> {
  const grouped = new Map<OrderPdfCategory, TestItem[]>([
    ["laboratory", []],
    ["image", []],
    ["procedure", []],
    ["interconsultation", []],
  ]);

  for (const test of input.tests) {
    const category = classifyCheckupTest(test.name);
    grouped.get(category)?.push(test);
  }

  for (const [category, tests] of [...grouped.entries()]) {
    if (tests.length === 0) {
      grouped.delete(category);
    }
  }

  return grouped;
}

function mapAssetRow(row: {
  requestType: TransbankRequestTypeDb;
  requestId: string;
  category: OrderPdfCategoryDb;
  fileName: string;
  blobUrl: string;
  blobPath: string;
  sizeBytes: number;
}): StoredOrderPdfAsset {
  return {
    requestType: fromDbRequestType(row.requestType),
    requestId: row.requestId,
    category: fromDbCategory(row.category),
    fileName: row.fileName,
    blobUrl: row.blobUrl,
    blobPath: row.blobPath,
    sizeBytes: row.sizeBytes,
  };
}

function sortAssetsByCategory(assets: StoredOrderPdfAsset[]) {
  return [...assets].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
  );
}

export async function ensureOrderPdfAssets(
  input: EnsureOrderPdfAssetsInput,
): Promise<StoredOrderPdfAsset[]> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN no está configurada.");
  }

  const requestTypeDb = toDbRequestType(input.requestType);
  const requestedCategories = getTargetCategories(input);

  if (requestedCategories.size === 0) {
    return [];
  }

  const existingRows = await prisma.orderPdfAsset.findMany({
    where: {
      requestType: requestTypeDb,
      requestId: input.requestId,
    },
  });

  const existingByCategory = new Map<OrderPdfCategory, StoredOrderPdfAsset>(
    existingRows.map((row) => {
      const mapped = mapAssetRow(row);
      return [
        mapped.category,
        {
          ...mapped,
          renderEngine: "existing" as const,
          renderError: null,
        },
      ];
    }),
  );

  for (const [category, tests] of requestedCategories.entries()) {
    const existingAsset = existingByCategory.get(category);
    const hasCurrentVersionPath = existingAsset?.blobPath.includes(`/${CURRENT_RENDER_VERSION}/`);
    if (existingAsset && !input.forceRegenerate && hasCurrentVersionPath) {
      continue;
    }

    const fileName = `orden-${input.requestType}-${input.requestId}-${getCategoryLabel(category)}.pdf`;
    const blobPath = `ordenes/${CURRENT_RENDER_VERSION}/${input.requestType}/${input.requestId}/${getCategoryLabel(
      category,
    )}-${input.issuedAtMs}.pdf`;
    let buffer: Buffer;
    let renderEngine: "chromium" | "pdf-lib" = "chromium";
    let renderError: string | null = null;
    const allowFallbackPdfLib = process.env.ORDER_PDF_ALLOW_FALLBACK === "1";
    try {
      buffer = await renderOrderPdfFromOrderPage({
        requestType: input.requestType,
        requestId: input.requestId,
        category,
      });
    } catch (error) {
      if (!allowFallbackPdfLib) {
        throw error;
      }

      renderEngine = "pdf-lib";
      renderError = error instanceof Error ? error.message : "Error desconocido renderizando con Chromium.";
      console.error("No pudimos renderizar PDF con Chromium, usamos fallback pdf-lib", {
        requestType: input.requestType,
        requestId: input.requestId,
        category,
        error,
      });
      buffer = await buildOrderPdf({
        title: getTitleForCategory(category),
        patient: input.patient,
        tests,
        issuedAtMs: input.issuedAtMs,
        referralTo: category === "interconsultation" ? "Oftalmólogo/a" : undefined,
      });
    }

    const blob = await put(blobPath, buffer, {
      access: "public",
      contentType: "application/pdf",
      addRandomSuffix: false,
      allowOverwrite: Boolean(input.forceRegenerate),
    });

    const saved = await prisma.orderPdfAsset.upsert({
      where: {
        requestType_requestId_category: {
          requestType: requestTypeDb,
          requestId: input.requestId,
          category: toDbCategory(category),
        },
      },
      update: {
        fileName,
        blobUrl: blob.url,
        blobPath: blob.pathname,
        sizeBytes: buffer.byteLength,
      },
      create: {
        requestType: requestTypeDb,
        requestId: input.requestId,
        category: toDbCategory(category),
        fileName,
        blobUrl: blob.url,
        blobPath: blob.pathname,
        sizeBytes: buffer.byteLength,
      },
    });

    existingByCategory.set(category, {
      ...mapAssetRow(saved),
      renderEngine,
      renderError,
    });
  }

  const assets = [...existingByCategory.values()].filter((asset) =>
    requestedCategories.has(asset.category),
  );
  return sortAssetsByCategory(assets);
}
