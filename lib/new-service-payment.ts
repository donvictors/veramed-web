"use client";

export async function startNewServicePayment(orderId: string, amount: number, discountCode?: string) {
  const response = await fetch("/api/payments/transbank/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderId, amount, discountCode: discountCode || undefined, sessionId: `web-${crypto.randomUUID()}` }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.redirectUrl) throw new Error(payload.error || "No pudimos iniciar el pago.");
  window.location.assign(payload.redirectUrl);
}
