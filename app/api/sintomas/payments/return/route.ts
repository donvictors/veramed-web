import { NextResponse } from "next/server";
import { buildTransbankTransaction } from "@/lib/server/transbank/config";
import { parseCommitResponse } from "@/lib/server/transbank/normalize";
import {
  getSymptomsPaymentTransactionByToken,
  markSymptomsPaymentTransactionResult,
} from "@/lib/server/symptoms-payment";
import { markSymptomsPaymentPaid } from "@/lib/server/symptoms-store";

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

function redirectToFlow(request: Request, requestId: string) {
  const url = new URL("/sintomas/flujo", request.url);
  url.searchParams.set("payment", "paid");
  url.searchParams.set("requestId", requestId);
  return NextResponse.redirect(url);
}

async function handleReturn(request: Request, token: string) {
  if (!token) {
    return redirectWithError(request, "missing-token");
  }

  const current = await getSymptomsPaymentTransactionByToken(token);
  if (!current) {
    return redirectWithError(request, "missing-transaction");
  }

  if (current.status === "PAID") {
    return redirectToFlow(request, current.requestId);
  }

  if (current.status === "REJECTED") {
    return redirectWithError(request, "rejected");
  }

  try {
    const transaction = buildTransbankTransaction();
    const commitRaw = await transaction.commit(token);
    const parsed = parseCommitResponse(commitRaw);
    const approved = parsed.approved;

    await markSymptomsPaymentTransactionResult({
      token,
      status: approved ? "PAID" : "REJECTED",
      authorizationCode: parsed.authorizationCode,
      buyOrder: parsed.buyOrder,
      responseCode: parsed.responseCode,
      paymentTypeCode: parsed.paymentTypeCode,
      cardLast4: parsed.cardLast4,
      transactionDate: parsed.transactionDate,
      rawResponse: commitRaw,
      errorReason: approved ? undefined : "Transacción rechazada por Transbank.",
    });

    if (!approved) {
      return redirectWithError(request, "rejected");
    }

    await markSymptomsPaymentPaid({
      requestId: current.requestId,
      paymentId: token,
      amount: current.amount,
      cardLast4: parsed.cardLast4 ?? "0000",
    });

    return redirectToFlow(request, current.requestId);
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

