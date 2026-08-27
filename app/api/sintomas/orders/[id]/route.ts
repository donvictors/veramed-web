import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";
import { hasValidInternalAccess } from "@/lib/server/internal-access";
import {
  getRequestAccessCookieName,
  hasValidRequestAccessCookie,
} from "@/lib/server/request-access";
import { getSymptomsRequest } from "@/lib/server/symptoms-store";
import { listSymptomsSignedPdfAssets } from "@/lib/server/symptoms-order-pdf-assets";
import { toSymptomsOrderDraftFromRecord } from "@/lib/server/symptoms-order-mapper";
import { createTemporaryPdfAccessLinks } from "@/lib/server/order-pdf-access";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Params) {
  const { id } = await context.params;
  const requestId = id?.trim();

  if (!requestId) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const record = await getSymptomsRequest(requestId);
  if (!record) {
    return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }

  const internalAccess = hasValidInternalAccess(_request, {
    requestType: "symptoms",
    requestId,
  });
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  const user = await getUserFromSession(token);
  const requestAccessCookie = cookieStore.get(getRequestAccessCookieName())?.value;

  if (record.userId && !internalAccess) {
    if (!user || user.id !== record.userId) {
      return NextResponse.json({ error: "No tienes acceso a esta solicitud." }, { status: 403 });
    }
  } else if (!record.userId && !internalAccess) {
    const hasGuestAccess = hasValidRequestAccessCookie(requestAccessCookie, {
      requestType: "symptoms",
      requestId,
      createdAtMs: record.createdAt,
    });
    if (!hasGuestAccess) {
      return NextResponse.json({ error: "No tienes acceso a esta solicitud." }, { status: 403 });
    }
  }

  const order = toSymptomsOrderDraftFromRecord(record);
  let signedAssets: Awaited<ReturnType<typeof listSymptomsSignedPdfAssets>> = [];
  try {
    signedAssets = await listSymptomsSignedPdfAssets(requestId);
  } catch (error) {
    console.error("No pudimos cargar assets firmados de síntomas", {
      requestId,
      error,
    });
  }

  const signedLinks =
    record.reviewStatus === "validated"
      ? await createTemporaryPdfAccessLinks({
          requestType: "symptoms",
          assets: signedAssets.map((asset) => ({ ...asset, requestId })),
          purpose: "patient",
          recipientKey: user?.id ?? `guest:${requestId}`,
        })
      : [];

  return NextResponse.json({
    order: {
      ...order,
      reviewStatus: record.reviewStatus,
      validatedByEmail: record.validatedByEmail,
      validatedAt: record.validatedAt,
      signedPdfLinks: signedLinks.map((asset) => ({
        category: asset.category,
        url: asset.url,
        fileName: asset.fileName,
        expiresAt: asset.expiresAt,
      })),
    },
  });
}
