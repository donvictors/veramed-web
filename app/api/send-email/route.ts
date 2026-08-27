import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";
import { getCheckupRecord } from "@/lib/server/checkup-store";
import { getChronicControlRecord } from "@/lib/server/chronic-control-store";
import { ensureOrderPdfAssets } from "@/lib/server/order-pdf-assets";
import { type TestItem } from "@/lib/checkup";
import { createTemporaryPdfAccessLinks } from "@/lib/server/order-pdf-access";
import {
  enforceRateLimit,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";

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
  forceResend?: boolean;
};

type RequestContext = {
  requestType: RequestType;
  requestId: string;
  userId?: string;
  patientEmail: string;
  patientName: string;
  patient: {
    fullName: string;
    rut: string;
    birthDate: string;
    email: string;
    phone: string;
    address: string;
  };
  paid: boolean;
  approved: boolean;
  issuedAtMs: number;
  tests: TestItem[];
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

function normalizeCategoryLabel(
  category: "laboratory" | "image" | "procedure" | "interconsultation",
) {
  if (category === "image") return "Orden de imágenes ☢️";
  if (category === "procedure") return "Orden de procedimientos 🏥";
  if (category === "interconsultation") return "Orden de derivación 👁️";
  return "Orden de laboratorio 💉";
}

function buildPdfLinksHtml(
  assets: Array<{
    category: "laboratory" | "image" | "procedure" | "interconsultation";
    blobUrl: string;
  }>,
) {
  if (assets.length === 0) {
    return "";
  }

  const links = assets
    .map((asset) => {
      const label = escapeHtml(normalizeCategoryLabel(asset.category));
      const href = escapeHtml(asset.blobUrl);
      return `<li style="margin: 0 0 4px;"><a href="${href}" style="color:#0f172a;font-weight:600;">${label}</a></li>`;
    })
    .join("");

  return `
    <p style="margin: 0 0 8px;">
      Puedes revisar tus órdenes validadas en tu cuenta o abrirlos en PDF:
    </p>
    <ul style="margin: 0 0 12px 18px; padding: 0;">
      ${links}
    </ul>
  `;
}

async function getRequestContext(payload: SendEmailPayload) {
  if (!payload.requestId || !isValidRequestType(payload.requestType)) {
    return { error: "Solicitud inválida para envío de correo." } as const;
  }

  if (payload.requestType === "checkup") {
    const request = await getCheckupRecord(payload.requestId);

    if (!request) {
      return { error: "Solicitud no encontrada." } as const;
    }

    return {
      requestType: "checkup" as const,
      requestId: request.id,
      userId: request.userId,
      patientEmail: request.patient.email?.trim().toLowerCase() ?? "",
      patientName: request.patient.fullName?.trim() || "Paciente Veramed",
      patient: request.patient,
      paid: Boolean(request.payment.confirmed?.paid),
      approved: request.status.status === "approved",
      issuedAtMs: request.status.approvedAt ?? request.status.queuedAt ?? request.updatedAt,
      tests: request.rec.tests,
    } as const;
  }

  const request = await getChronicControlRecord(payload.requestId);

  if (!request) {
    return { error: "Solicitud no encontrada." } as const;
  }

  return {
    requestType: "chronic_control" as const,
    requestId: request.id,
    userId: request.userId,
    patientEmail: request.patient.email?.trim().toLowerCase() ?? "",
    patientName: request.patient.fullName?.trim() || "Paciente Veramed",
    patient: request.patient,
    paid: Boolean(request.payment.confirmed?.paid),
    approved: request.status.status === "approved",
    issuedAtMs: request.status.approvedAt ?? request.status.queuedAt ?? request.updatedAt,
    tests: request.rec.tests,
  } as const;
}

async function getEmailSendState(context: RequestContext) {
  if (context.requestType === "checkup") {
    const row = await prisma.checkupRequest.findUnique({
      where: { id: context.requestId },
      select: { orderEmailSentAt: true, orderEmailMessageId: true },
    });

    return {
      sentAt: row?.orderEmailSentAt ?? null,
      messageId: row?.orderEmailMessageId ?? null,
    };
  }

  const row = await prisma.chronicControlRequest.findUnique({
    where: { id: context.requestId },
    select: { orderEmailSentAt: true, orderEmailMessageId: true },
  });

  return {
    sentAt: row?.orderEmailSentAt ?? null,
    messageId: row?.orderEmailMessageId ?? null,
  };
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

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "RESEND_API_KEY no está configurada." },
      { status: 500 },
    );
  }

  try {
    requireSameOrigin(request);
    await enforceRateLimit({ request, action: "order:send-email", limit: 8, windowMs: 15 * 60 * 1000 });
    const payload = (await readJsonBody(request, 16_000)) as SendEmailPayload;

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
  const ownerUserId = requestContext.userId;

  if (ownerUserId && (!sessionUser || sessionUser.id !== ownerUserId)) {
    return NextResponse.json({ ok: false, error: "No tienes acceso a esta solicitud." }, { status: 403 });
  }

  if (!ownerUserId) {
    const expectedSupportToken = process.env.INTERNAL_SUPPORT_TOKEN?.trim();
    const providedSupportToken = request.headers.get("x-support-token")?.trim();
    if (!expectedSupportToken || !providedSupportToken || providedSupportToken !== expectedSupportToken) {
      return NextResponse.json(
        { ok: false, error: "No tienes acceso a esta solicitud." },
        { status: 403 },
      );
    }
  }

  if (!requestContext.patientEmail || requestContext.patientEmail !== email) {
    return NextResponse.json(
      { ok: false, error: "El correo no coincide con el paciente de la solicitud." },
      { status: 400 },
    );
  }

  if (!requestContext.paid) {
    return NextResponse.json(
      { ok: false, error: "La solicitud aún no tiene pago confirmado." },
      { status: 400 },
    );
  }

  if (!requestContext.approved) {
    return NextResponse.json(
      { ok: false, error: "La orden aún no está aprobada para envío." },
      { status: 400 },
    );
  }

  let pdfAssets: Awaited<ReturnType<typeof ensureOrderPdfAssets>> = [];
  let pdfAssetsError: string | null = null;
  try {
    pdfAssets = await ensureOrderPdfAssets({
      requestType: requestContext.requestType,
      requestId: requestContext.requestId,
      patient: requestContext.patient,
      tests: requestContext.tests,
      issuedAtMs: requestContext.issuedAtMs,
      forceRegenerate: Boolean(payload.forceResend),
    });
  } catch (error) {
    pdfAssetsError =
      error instanceof Error
        ? error.message
        : "No pudimos generar los PDFs en Blob para esta solicitud.";
    console.error("No pudimos asegurar PDFs en Blob para envío de correo", error);
  }

  const hasTestsToSend = requestContext.tests.length > 0;
  if (hasTestsToSend && pdfAssets.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: pdfAssetsError
          ? `No pudimos preparar los PDFs de la orden: ${pdfAssetsError}`
          : "No pudimos preparar los PDFs de la orden.",
      },
      { status: 500 },
    );
  }

  const linkedPdfAssets = await createTemporaryPdfAccessLinks({
    requestType: requestContext.requestType,
    assets: pdfAssets,
    purpose: "email",
    recipientKey: requestContext.patientEmail,
  });

  const sendState = await getEmailSendState(requestContext);
  if (sendState.sentAt && !payload.forceResend) {
    return NextResponse.json({
      ok: true,
      deduped: true,
      id: sendState.messageId ?? null,
      attachedPdf: false,
      pdfAssetsError,
      pdfAssets: linkedPdfAssets.map((asset) => ({
        category: asset.category,
        url: asset.url,
        fileName: asset.fileName,
      })),
    });
  }

  const firstName = escapeHtml(extractFirstName(payload.patientName || requestContext.patientName));
  const pdfLinksHtml = buildPdfLinksHtml(
    linkedPdfAssets.map((asset) => ({
      category: asset.category,
      blobUrl: asset.url,
    })),
  );

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <p style="margin: 0 0 12px;">
        Hola ${firstName},
      </p>
      <p style="margin: 0 0 12px;">
        Tu orden de exámenes ya fue generada y validada.
      </p>
      <p style="margin: 0 0 12px;">
        Puedes revisar tus órdenes validadas en tu cuenta o abrirlos en PDF aquí.
      </p>
      ${pdfLinksHtml}
      <p style="margin: 0 0 12px;">
        Esperamos que tengas un gran día y sigas cuidando tu salud como hasta ahora.
      </p>
      <p style="margin: 0 0 12px;">
        Nuestros mejores deseos,
      </p>
      <p style="margin: 0 0 12px;">
        Equipo Veramed 👨🏻‍⚕️👩🏻‍⚕️
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
    attachedPdf: false,
    pdfAssetsError,
    pdfAssets: linkedPdfAssets.map((asset) => ({
      category: asset.category,
      url: asset.url,
      fileName: asset.fileName,
    })),
  });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos enviar el correo.");
  }
}
