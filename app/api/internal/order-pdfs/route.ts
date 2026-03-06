import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { type OrderPdfCategoryDb, type TransbankRequestTypeDb } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";

type RequestType = "checkup" | "chronic_control";
type Category = "laboratory" | "image" | "procedure";

function toRequestType(value: TransbankRequestTypeDb): RequestType {
  return value === "checkup" ? "checkup" : "chronic_control";
}

function toCategory(value: OrderPdfCategoryDb): Category {
  if (value === "image") return "image";
  if (value === "procedure") return "procedure";
  return "laboratory";
}

function parseRequestType(value: string | null): RequestType | null {
  if (value === "checkup" || value === "chronic_control") {
    return value;
  }
  return null;
}

function isSupportTokenValid(request: Request) {
  const expected = process.env.INTERNAL_SUPPORT_TOKEN?.trim();
  if (!expected) return false;

  const provided = request.headers.get("x-support-token")?.trim();
  return Boolean(provided && provided === expected);
}

async function canReadRequest(
  requestType: RequestType,
  requestId: string,
  userId: string | undefined,
  bypass: boolean,
) {
  if (bypass) {
    return true;
  }

  if (!userId) {
    return false;
  }

  if (requestType === "checkup") {
    const request = await prisma.checkupRequest.findUnique({
      where: { id: requestId },
      select: { userId: true },
    });

    if (!request) return false;
    return request.userId === userId;
  }

  const request = await prisma.chronicControlRequest.findUnique({
    where: { id: requestId },
    select: { userId: true },
  });

  if (!request) return false;
  return request.userId === userId;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestId = url.searchParams.get("requestId")?.trim() ?? "";
  const requestTypeParam = parseRequestType(url.searchParams.get("requestType"));

  if (!requestId) {
    return NextResponse.json(
      { ok: false, error: "requestId es obligatorio." },
      { status: 400 },
    );
  }

  const bypass = isSupportTokenValid(request);
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  const user = await getUserFromSession(token);

  if (!bypass && !user) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  let rows: Awaited<ReturnType<typeof prisma.orderPdfAsset.findMany>> = [];

  if (requestTypeParam) {
    const allowed = await canReadRequest(requestTypeParam, requestId, user?.id, bypass);
    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "No tienes acceso a esta solicitud." },
        { status: 403 },
      );
    }

    rows = await prisma.orderPdfAsset.findMany({
      where: {
        requestId,
        requestType: requestTypeParam,
      },
      orderBy: [{ category: "asc" }, { createdAt: "asc" }],
    });
  } else {
    const [canReadCheckup, canReadChronic] = await Promise.all([
      canReadRequest("checkup", requestId, user?.id, bypass),
      canReadRequest("chronic_control", requestId, user?.id, bypass),
    ]);

    if (!canReadCheckup && !canReadChronic) {
      return NextResponse.json(
        { ok: false, error: "No tienes acceso a esta solicitud." },
        { status: 403 },
      );
    }

    rows = await prisma.orderPdfAsset.findMany({
      where: {
        requestId,
        requestType: {
          in: [
            ...(canReadCheckup ? (["checkup"] as const) : []),
            ...(canReadChronic ? (["chronic_control"] as const) : []),
          ],
        },
      },
      orderBy: [{ requestType: "asc" }, { category: "asc" }, { createdAt: "asc" }],
    });
  }

  return NextResponse.json({
    ok: true,
    requestId,
    requestType: requestTypeParam ?? null,
    count: rows.length,
    items: rows.map((row) => ({
      id: row.id,
      requestType: toRequestType(row.requestType),
      requestId: row.requestId,
      category: toCategory(row.category),
      fileName: row.fileName,
      blobUrl: row.blobUrl,
      blobPath: row.blobPath,
      sizeBytes: row.sizeBytes,
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
    })),
  });
}
