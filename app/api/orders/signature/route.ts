import { NextResponse } from "next/server";
import {
  getApprovedMedicalSigner,
  loadProtectedMedicalSignature,
  type ClinicalRequestType,
} from "@/lib/server/medical-approval";
import { authorizeOrderRequest } from "@/lib/server/order-request-authorization";

export const runtime = "nodejs";

function isRequestType(value: string): value is ClinicalRequestType {
  return value === "checkup" || value === "chronic_control" || value === "symptoms";
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const requestType = params.get("requestType")?.trim() ?? "";
  const requestId = params.get("requestId")?.trim() ?? "";

  if (!isRequestType(requestType) || !requestId) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const authorization = await authorizeOrderRequest(request, requestType, requestId);
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status },
    );
  }

  const signer = await getApprovedMedicalSigner(requestType, requestId);
  if (!signer) {
    return NextResponse.json(
      { error: "La orden todavía no tiene una aprobación médica firmable." },
      { status: 403 },
    );
  }

  try {
    const signature = await loadProtectedMedicalSignature();
    return new NextResponse(signature, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("No pudimos cargar la firma médica protegida", { requestId, error });
    return NextResponse.json({ error: "Firma no disponible." }, { status: 500 });
  }
}
