import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const FROM_EMAIL = "Veramed <ordenes@mail.veramed.cl>";
const SUBJECT = "Tu orden de exámenes está lista 📋";

type Payload = {
  email?: string;
  orderId?: string;
  verificationCode?: string;
  orderLink?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: false, error: "RESEND_API_KEY no está configurada." }, { status: 500 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: "Payload inválido." }, { status: 400 });
  }

  const email = payload.email?.trim().toLowerCase() ?? "";
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Correo inválido." }, { status: 400 });
  }

  const orderId = payload.orderId?.trim() || "N/A";
  const verificationCode = payload.verificationCode?.trim() || "N/A";
  const orderLink = payload.orderLink?.trim() || "";

  const linkHtml = orderLink
    ? `<p style="margin:0 0 12px;">Puedes revisar e imprimir tu orden haciendo clic <a href="${escapeHtml(orderLink)}">aquí</a>.</p>`
    : "";

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.6;">
      <p style="margin:0 0 12px;">Tu orden de exámenes por síntomas fue generada.</p>
      <p style="margin:0 0 12px;"><strong>ID:</strong> ${escapeHtml(orderId)}</p>
      <p style="margin:0 0 12px;"><strong>Código de verificación:</strong> ${escapeHtml(verificationCode)}</p>
      ${linkHtml}
      <p style="margin:18px 0 0;font-size:12px;color:#64748b;">Correo automático de Veramed. No responder.</p>
    </div>
  `;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const sent = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: SUBJECT,
      html,
    });

    return NextResponse.json({
      ok: true,
      messageId: sent.data?.id ?? null,
    });
  } catch (error) {
    console.error("POST /api/sintomas/send-email", error);
    return NextResponse.json({ ok: false, error: "No pudimos enviar el correo." }, { status: 500 });
  }
}
