import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";

export const runtime = "nodejs";

const FROM_EMAIL = "Veramed <ordenes@mail.veramed.cl>";
const DEFAULT_SUBJECT = "Tu orden de exámenes está lista 📋";

type RequestType = "checkup" | "chronic_control";

type SendEmailPayload = {
  email?: string;
  patientName?: string;
  orderLink?: string;
  requestType?: RequestType;
  requestId?: string;
  pdfUrl?: string;
  pdfBase64?: string;
  pdfFilename?: string;
};

function normalizeBase64Pdf(input: string) {
  return input.replace(/^data:application\/pdf;base64,/i, "").trim();
}

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

function extractFirstName(fullName?: string) {
  const trimmed = fullName?.trim() ?? "";
  if (!trimmed) {
    return "paciente";
  }

  return trimmed.split(/\s+/)[0];
}

function isValidRequestType(value?: string): value is RequestType {
  return value === "checkup" || value === "chronic_control";
}

function isPaidStatus(status: string | undefined) {
  return status === "paid";
}

function isApprovedStatus(status: string | undefined) {
  return status === "approved";
}

async function getRequestContext(payload: SendEmailPayload) {
  if (!payload.requestId || !isValidRequestType(payload.requestType)) {
    return { error: "Solicitud inválida para envío de correo." } as const;
  }

  if (payload.requestType === "checkup") {
    const request = await prisma.checkupRequest.findUnique({
      where: { id: payload.requestId },
      include: { payment: true },
    });

    if (!request) {
      return { error: "Solicitud no encontrada." } as const;
    }

    return { request } as const;
  }

  const request = await prisma.chronicControlRequest.findUnique({
    where: { id: payload.requestId },
    include: { payment: true },
  });

  if (!request) {
    return { error: "Solicitud no encontrada." } as const;
  }

  return { request } as const;
}

async function markEmailSent(payload: SendEmailPayload, messageId: string | null) {
  if (!payload.requestId || !isValidRequestType(payload.requestType)) {
    return;
  }

  const data = {
    orderEmailSentAt: new Date(),
    orderEmailMessageId: messageId,
  };

  if (payload.requestType === "checkup") {
    await prisma.checkupRequest.update({
      where: { id: payload.requestId },
      data,
    });
    return;
  }

  await prisma.chronicControlRequest.update({
    where: { id: payload.requestId },
    data,
  });
}

async function buildPdfAttachments(payload: SendEmailPayload, request: Request) {
  if (payload.pdfBase64) {
    const content = normalizeBase64Pdf(payload.pdfBase64);
    if (!content) {
      throw new Error("El PDF base64 está vacío.");
    }

    return [
      {
        filename: payload.pdfFilename || "orden-veramed.pdf",
        content,
        content_type: "application/pdf",
      },
    ];
  }

  if (payload.pdfUrl) {
    const requestOrigin = new URL(request.url).origin;
    const absoluteUrl = payload.pdfUrl.startsWith("http")
      ? payload.pdfUrl
      : new URL(payload.pdfUrl, requestOrigin).toString();

    const pdfOrigin = new URL(absoluteUrl).origin;
    if (pdfOrigin !== requestOrigin) {
      throw new Error("El enlace del PDF debe pertenecer al mismo dominio.");
    }

    const cookieHeader = request.headers.get("cookie");
    const response = await fetch(absoluteUrl, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    });
    if (!response.ok) {
      throw new Error("No pudimos descargar el PDF desde el enlace proporcionado.");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0) {
      throw new Error("El PDF descargado está vacío.");
    }

    return [
      {
        filename: payload.pdfFilename || "orden-veramed.pdf",
        content: buffer.toString("base64"),
        content_type: "application/pdf",
      },
    ];
  }

  return [];
}

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "RESEND_API_KEY no está configurada." },
      { status: 500 },
    );
  }

  let payload: SendEmailPayload;
  try {
    payload = (await request.json()) as SendEmailPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Payload inválido para envío de correo." },
      { status: 400 },
    );
  }

  const email = payload.email?.trim().toLowerCase() ?? "";
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Correo del paciente inválido." }, { status: 400 });
  }

  const requestContext = await getRequestContext(payload);
  if ("error" in requestContext) {
    return NextResponse.json({ ok: false, error: requestContext.error }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  const sessionUser = await getUserFromSession(token);
  const ownerUserId = requestContext.request.userId;

  if (ownerUserId && (!sessionUser || sessionUser.id !== ownerUserId)) {
    return NextResponse.json({ ok: false, error: "No tienes acceso a esta solicitud." }, { status: 403 });
  }

  if (!requestContext.request.patientEmail || requestContext.request.patientEmail.trim().toLowerCase() !== email) {
    return NextResponse.json(
      { ok: false, error: "El correo no coincide con el paciente de la solicitud." },
      { status: 400 },
    );
  }

  if (!requestContext.request.payment || !isPaidStatus(requestContext.request.payment.status)) {
    return NextResponse.json(
      { ok: false, error: "La solicitud aún no tiene pago confirmado." },
      { status: 400 },
    );
  }

  if (!isApprovedStatus(requestContext.request.reviewStatus)) {
    return NextResponse.json(
      { ok: false, error: "La orden aún no está aprobada para envío." },
      { status: 400 },
    );
  }

  if (requestContext.request.orderEmailSentAt) {
    return NextResponse.json({
      ok: true,
      deduped: true,
      id: requestContext.request.orderEmailMessageId ?? null,
      attachedPdf: false,
    });
  }

  let attachments: Array<{
    filename: string;
    content: string;
    content_type: string;
  }> = [];
  try {
    attachments = await buildPdfAttachments(payload, request);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "No pudimos preparar el PDF para adjuntar.",
      },
      { status: 400 },
    );
  }

  const safeOrderLink = payload.orderLink?.trim();
  const firstName = escapeHtml(extractFirstName(payload.patientName));
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <p style="margin: 0 0 12px;">
        Hola ${firstName},
      </p>
      <p style="margin: 0 0 12px;">
        Tu orden de exámenes ya fue generada y validada.
      </p>
      <p style="margin: 0 0 12px;">
        Puedes revisar los detalles desde tu cuenta o ir a la página de impresión de órdenes haciendo clic ${
          safeOrderLink
            ? `<a href="${safeOrderLink}" style="color:#0f172a;font-weight:600;">aquí</a>`
            : "aquí"
        }.
      </p>
      <p style="margin: 0 0 12px;">
        Esperamos que tengas un gran día y sigas cuidando tu salud.
      </p>
      <p style="margin: 0 0 12px;">
        Nuestros mejores deseos,
      </p>
      <p style="margin: 0 0 12px;">
        Equipo Veramed
      </p>
      <p style="margin: 18px 0 8px; color: #64748b; font-size: 12px;">
        -----------------------------------------------------------------------------------
      </p>
      <p style="margin: 0; color: #475569; font-size: 13px;">
        Este correo fue enviado por el asistente automático de Veramed 🤖. No responder.
      </p>
    </div>
  `;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: DEFAULT_SUBJECT,
    html,
    attachments: attachments.length > 0 ? attachments : undefined,
  });

  if (result.error) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error.message || "No pudimos enviar el correo con Resend.",
      },
      { status: 500 },
    );
  }

  await markEmailSent(payload, result.data?.id ?? null);

  return NextResponse.json({
    ok: true,
    id: result.data?.id ?? null,
    attachedPdf: attachments.length > 0,
  });
}
