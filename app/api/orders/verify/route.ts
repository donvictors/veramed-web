import { NextResponse } from "next/server";
import {
  enforceRateLimit,
  HttpRequestError,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";
import { verifyMedicalOrderCode } from "@/lib/server/order-verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await enforceRateLimit({
      request,
      action: "public-order-verification",
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });

    const body = await readJsonBody(request, 2_048);
    const code =
      body && typeof body === "object" && "code" in body
        ? String((body as { code?: unknown }).code ?? "")
        : "";

    if (!code.trim() || code.length > 80) {
      throw new HttpRequestError("Ingresa un código de verificación válido.", 400);
    }

    const result = await verifyMedicalOrderCode(code);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("POST /api/orders/verify failed", error);
    return httpErrorResponse(error, "No pudimos verificar el código en este momento.");
  }
}
