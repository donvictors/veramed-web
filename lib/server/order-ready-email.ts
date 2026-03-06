import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { ensureOrderPdfAssets } from "@/lib/server/order-pdf-assets";

type RequestType = "checkup" | "chronic_control";

type SendApprovedOrderEmailInput = {
  requestType: RequestType;
  requestId: string;
  forceResend?: boolean;
};

type SendApprovedOrderEmailResult = {
  ok: boolean;
  deduped?: boolean;
  messageId?: string | null;
  pdfAssets: Array<{
    category: "laboratory" | "image" | "procedure" | "interconsultation";
    url: string;
    fileName: string;
  }>;
};

const FROM_EMAIL = "Veramed <ordenes@mail.veramed.cl>";
const DEFAULT_SUBJECT = "Tu orden de exámenes está lista 📋";

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

function parseTests(rec: unknown) {
  if (!rec || typeof rec !== "object") return [];
  const testsRaw = (rec as { tests?: unknown }).tests;
  if (!Array.isArray(testsRaw)) return [];

  return testsRaw
    .map((test) => {
      if (!test || typeof test !== "object") return null;
      const name = String((test as { name?: unknown }).name ?? "").trim();
      const why = String((test as { why?: unknown }).why ?? "").trim();
      if (!name) return null;
      return { name, why };
    })
    .filter((item): item is { name: string; why: string } => Boolean(item));
}

export async function sendApprovedOrderEmail(
  input: SendApprovedOrderEmailInput,
): Promise<SendApprovedOrderEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no está configurada.");
  }

  const forceResend = Boolean(input.forceResend);

  if (input.requestType === "checkup") {
    const request = await prisma.checkupRequest.findUnique({
      where: { id: input.requestId },
      include: { payment: true },
    });

    if (!request) {
      throw new Error("Solicitud no encontrada.");
    }

    if (!request.patientEmail?.trim()) {
      throw new Error("La solicitud no tiene correo de paciente.");
    }

    if (request.reviewStatus !== "approved") {
      throw new Error("La solicitud aún no está aprobada.");
    }

    if (!request.payment || request.payment.status !== "paid") {
      throw new Error("La solicitud aún no tiene pago confirmado.");
    }

    if (request.orderEmailSentAt && !forceResend) {
      return {
        ok: true,
        deduped: true,
        messageId: request.orderEmailMessageId ?? null,
        pdfAssets: [],
      };
    }

    const tests = parseTests(request.rec);
    const issuedAtMs =
      request.approvedAt?.getTime() ?? request.queuedAt?.getTime() ?? request.updatedAt.getTime();
    const patient = {
      fullName: [request.patientFirstName, request.patientPaternalSurname, request.patientMaternalSurname]
        .filter(Boolean)
        .join(" "),
      rut: request.patientRut,
      birthDate: request.patientBirthDate,
      email: request.patientEmail,
      phone: request.patientPhone,
      address: request.patientAddress,
    };

    const pdfAssets = await ensureOrderPdfAssets({
      requestType: "checkup",
      requestId: request.id,
      patient,
      tests,
      issuedAtMs,
      forceRegenerate: forceResend,
    });

    if (tests.length > 0 && pdfAssets.length === 0) {
      throw new Error("No pudimos preparar los PDFs de la orden.");
    }

    const firstName = escapeHtml(extractFirstName(patient.fullName));
    const pdfLinksHtml = buildPdfLinksHtml(
      pdfAssets.map((asset) => ({
        category: asset.category,
        blobUrl: asset.blobUrl,
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
      to: [patient.email.trim().toLowerCase()],
      subject: DEFAULT_SUBJECT,
      html,
    });

    if (result.error) {
      throw new Error(result.error.message || "No pudimos enviar el correo con Resend.");
    }

    await prisma.checkupRequest.update({
      where: { id: request.id },
      data: {
        orderEmailSentAt: new Date(),
        orderEmailMessageId: result.data?.id ?? null,
      },
    });

    return {
      ok: true,
      messageId: result.data?.id ?? null,
      pdfAssets: pdfAssets.map((asset) => ({
        category: asset.category,
        url: asset.blobUrl,
        fileName: asset.fileName,
      })),
    };
  }

  const request = await prisma.chronicControlRequest.findUnique({
    where: { id: input.requestId },
    include: { payment: true },
  });

  if (!request) {
    throw new Error("Solicitud no encontrada.");
  }

  if (!request.patientEmail?.trim()) {
    throw new Error("La solicitud no tiene correo de paciente.");
  }

  if (request.reviewStatus !== "approved") {
    throw new Error("La solicitud aún no está aprobada.");
  }

  if (!request.payment || request.payment.status !== "paid") {
    throw new Error("La solicitud aún no tiene pago confirmado.");
  }

  if (request.orderEmailSentAt && !forceResend) {
    return {
      ok: true,
      deduped: true,
      messageId: request.orderEmailMessageId ?? null,
      pdfAssets: [],
    };
  }

  const tests = parseTests(request.rec);
  const issuedAtMs =
    request.approvedAt?.getTime() ?? request.queuedAt?.getTime() ?? request.updatedAt.getTime();
  const patient = {
    fullName: [request.patientFirstName, request.patientPaternalSurname, request.patientMaternalSurname]
      .filter(Boolean)
      .join(" "),
    rut: request.patientRut,
    birthDate: request.patientBirthDate,
    email: request.patientEmail,
    phone: request.patientPhone,
    address: request.patientAddress,
  };

  const pdfAssets = await ensureOrderPdfAssets({
    requestType: "chronic_control",
    requestId: request.id,
    patient,
    tests,
    issuedAtMs,
    forceRegenerate: forceResend,
  });

  if (tests.length > 0 && pdfAssets.length === 0) {
    throw new Error("No pudimos preparar los PDFs de la orden.");
  }

  const firstName = escapeHtml(extractFirstName(patient.fullName));
  const pdfLinksHtml = buildPdfLinksHtml(
    pdfAssets.map((asset) => ({
      category: asset.category,
      blobUrl: asset.blobUrl,
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
    to: [patient.email.trim().toLowerCase()],
    subject: DEFAULT_SUBJECT,
    html,
  });

  if (result.error) {
    throw new Error(result.error.message || "No pudimos enviar el correo con Resend.");
  }

  await prisma.chronicControlRequest.update({
    where: { id: request.id },
    data: {
      orderEmailSentAt: new Date(),
      orderEmailMessageId: result.data?.id ?? null,
    },
  });

  return {
    ok: true,
    messageId: result.data?.id ?? null,
    pdfAssets: pdfAssets.map((asset) => ({
      category: asset.category,
      url: asset.blobUrl,
      fileName: asset.fileName,
    })),
  };
}
