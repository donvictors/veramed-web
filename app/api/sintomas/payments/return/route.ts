import { NextResponse } from "next/server";
import { buildTransbankTransaction } from "@/lib/server/transbank/config";
import { parseCommitResponse } from "@/lib/server/transbank/normalize";

export const runtime = "nodejs";

function extractTokenFromUrl(request: Request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get("token_ws")?.trim() ?? "";
}

async function extractTokenFromForm(request: Request) {
  try {
    const formData = await request.formData();
    return String(formData.get("token_ws") ?? "").trim();
  } catch {
    return "";
  }
}

function redirectWithError(request: Request, reason: string) {
  const url = new URL("/sintomas/pago", request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

function redirectToFlow(request: Request, token: string) {
  const url = new URL("/sintomas/flujo", request.url);
  url.searchParams.set("payment", "paid");
  url.searchParams.set("token", token);
  return NextResponse.redirect(url);
}

async function handleReturn(request: Request, token: string) {
  if (!token) {
    return redirectWithError(request, "missing-token");
  }

  try {
    const transaction = buildTransbankTransaction();
    const raw = await transaction.commit(token);
    const parsed = parseCommitResponse(raw);

    if (parsed.approved) {
      return redirectToFlow(request, token);
    }

    return redirectWithError(request, "rejected");
  } catch (error) {
    console.error("RETURN /api/sintomas/payments/return", error);
    return redirectWithError(request, "commit-failed");
  }
}

export async function GET(request: Request) {
  const token = extractTokenFromUrl(request);
  return handleReturn(request, token);
}

export async function POST(request: Request) {
  const token = await extractTokenFromForm(request);
  return handleReturn(request, token);
}
