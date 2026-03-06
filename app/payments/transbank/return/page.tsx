import { redirect } from "next/navigation";
import { commitTransbankPayment } from "@/lib/server/transbank/service";

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }
  return typeof value === "string" ? value.trim() : "";
}

function buildErrorUrl(reason: string, orderId?: string) {
  const params = new URLSearchParams();
  params.set("reason", reason);
  if (orderId) {
    params.set("orderId", orderId);
  }
  return `/payment/error?${params.toString()}`;
}

function buildSuccessUrl(orderId?: string) {
  const params = new URLSearchParams();
  if (orderId) {
    params.set("orderId", orderId);
  }
  return `/payment/success?${params.toString()}`;
}

function buildRequestStatusUrl(input: { requestType: "checkup" | "chronic_control"; requestId: string }) {
  if (input.requestType === "chronic_control") {
    return `/control-cronico/estado?id=${encodeURIComponent(input.requestId)}`;
  }
  return `/chequeo/estado?id=${encodeURIComponent(input.requestId)}`;
}

export const dynamic = "force-dynamic";

export default async function TransbankReturnPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolved = await searchParams;
  const token = getSingleParam(resolved.token_ws);
  const reason = getSingleParam(resolved.reason);

  if (!token) {
    redirect(buildErrorUrl(reason || "missing-token"));
  }

  let committed: Awaited<ReturnType<typeof commitTransbankPayment>>;
  try {
    committed = await commitTransbankPayment(token);
  } catch (error) {
    console.error("GET /payments/transbank/return", error);
    const params = new URLSearchParams();
    params.set("reason", "commit-failed");
    params.set("token_ws", token);
    redirect(`/payment/error?${params.toString()}`);
  }

  if (committed.status === "PAID") {
    if (committed.requestId) {
      redirect(buildRequestStatusUrl({ requestType: committed.requestType, requestId: committed.requestId }));
    }
    redirect(buildSuccessUrl(committed.orderId));
  }

  redirect(buildErrorUrl("rejected", committed.orderId));
}
