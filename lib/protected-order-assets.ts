export function buildProtectedSignatureUrl(input: {
  requestType: "checkup" | "chronic_control" | "symptoms";
  requestId: string;
  internalTs?: string;
  internalSig?: string;
}) {
  const params = new URLSearchParams({
    requestType: input.requestType,
    requestId: input.requestId,
  });
  if (input.internalTs && input.internalSig) {
    params.set("internalTs", input.internalTs);
    params.set("internalSig", input.internalSig);
  }
  return `/api/orders/signature?${params.toString()}`;
}
