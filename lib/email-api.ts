type SendOrderEmailPayload = {
  requestType: "checkup" | "chronic_control";
  requestId: string;
  email: string;
  patientName?: string;
  orderLink?: string;
  pdfUrl?: string;
  pdfBase64?: string;
  pdfFilename?: string;
  forceResend?: boolean;
};

export async function sendOrderReadyEmail(payload: SendOrderEmailPayload) {
  const response = await fetch("/api/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    id?: string | null;
    deduped?: boolean;
  };

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "No pudimos enviar el correo.");
  }

  return data;
}
