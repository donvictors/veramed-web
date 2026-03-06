import { NextResponse } from "next/server";
import { Resend } from "resend";

const TARGET_RECIPIENT = "contacto@mail.veramed.cl";
const FORWARD_DESTINATION = "vjrebolledo@uc.cl";

function extractEmailAddress(value: string) {
  const trimmed = value.trim().toLowerCase();
  const match = trimmed.match(/<([^>]+)>/);
  if (match?.[1]) {
    return match[1].trim().toLowerCase();
  }
  return trimmed;
}

function hasTargetRecipient(recipients: string[] | undefined) {
  if (!recipients || recipients.length === 0) {
    return false;
  }

  return recipients.some((recipient) => extractEmailAddress(recipient) === TARGET_RECIPIENT);
}

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_WEBHOOK_SECRET) {
    return NextResponse.json(
      { ok: false, error: "Faltan variables de entorno de Resend." },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  if (!rawBody) {
    return NextResponse.json({ ok: false, error: "Body vacío." }, { status: 400 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ ok: false, error: "Headers de firma incompletos." }, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  let event: ReturnType<typeof resend.webhooks.verify>;

  try {
    event = resend.webhooks.verify({
      payload: rawBody,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature,
      },
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Firma de webhook inválida." }, { status: 400 });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: true, reason: "evento_no_relevante" });
  }

  if (!hasTargetRecipient(event.data.to)) {
    return NextResponse.json({ ok: true, ignored: true, reason: "destino_no_filtrado" });
  }

  const receivingResponse = await resend.emails.receiving.get(event.data.email_id);
  if (receivingResponse.error || !receivingResponse.data) {
    return NextResponse.json(
      {
        ok: false,
        error: receivingResponse.error?.message || "No pudimos obtener el email recibido.",
      },
      { status: 502 },
    );
  }

  const inbound = receivingResponse.data;
  const subject = inbound.subject || event.data.subject || "(sin asunto)";
  const from = inbound.from || event.data.from || "(sin remitente)";
  const toLine = (inbound.to || event.data.to || []).join(", ") || "(sin destinatario)";
  const textBody = [
    "Reenvío automático de correo entrante (Resend inbound).",
    "",
    `From: ${from}`,
    `To: ${toLine}`,
    `Subject: ${subject}`,
    `Email ID: ${event.data.email_id}`,
    "",
    inbound.text?.trim() || "(Sin cuerpo de texto)",
  ].join("\n");

  const forwardResponse = await resend.emails.send({
    from: "Veramed <usuarios@mail.veramed.cl>",
    to: FORWARD_DESTINATION,
    subject: `Fwd: ${subject}`,
    text: textBody,
    html: inbound.html
      ? `<p><strong>From:</strong> ${from}</p>
<p><strong>To:</strong> ${toLine}</p>
<p><strong>Subject:</strong> ${subject}</p>
<hr />
${inbound.html}`
      : undefined,
  });

  if (forwardResponse.error) {
    return NextResponse.json(
      { ok: false, error: forwardResponse.error.message || "No pudimos reenviar el correo." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
