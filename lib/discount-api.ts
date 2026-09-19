import type { DiscountPricing } from "@/lib/discount-pricing";

export async function validateDiscountCode(input: {
  requestType: "checkup" | "chronic_control" | "symptoms" | "new_service" | "telemedicine";
  requestId?: string;
  code: string;
}) {
  const response = await fetch("/api/discounts/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => null)) as
    | { pricing?: DiscountPricing; appliedCode?: string; error?: string }
    | null;
  if (!response.ok || !payload?.pricing || !payload.appliedCode) {
    throw new Error(payload?.error || "Código no válido");
  }
  return {
    pricing: payload.pricing,
    appliedCode: payload.appliedCode,
  };
}
