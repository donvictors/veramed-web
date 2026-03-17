import { NextResponse } from "next/server";
import { getSymptomsRequest } from "@/lib/server/symptoms-store";
import { listSymptomsSignedPdfAssets } from "@/lib/server/symptoms-order-pdf-assets";
import { toSymptomsOrderDraftFromRecord } from "@/lib/server/symptoms-order-mapper";

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

  return NextResponse.json({
    order: {
      ...order,
      reviewStatus: record.reviewStatus,
      validatedByEmail: record.validatedByEmail,
      validatedAt: record.validatedAt,
      signedPdfLinks: signedAssets.map((asset) => ({
        category: asset.category,
        url: asset.blobUrl,
        fileName: asset.fileName,
      })),
    },
  });
}
