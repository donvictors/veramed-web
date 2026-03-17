import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { listSymptomsSignedPdfAssets } from "@/lib/server/symptoms-order-pdf-assets";
import type { OrderCategory } from "@/lib/order-categories";
import { joinPatientFullName } from "@/lib/checkup";

const FROM_EMAIL = "Veramed <ordenes@mail.veramed.cl>";
const SUBJECT = "Tu orden de exámenes está lista 📋";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getFirstName(fullName: string) {
  const clean = fullName.trim();
  if (!clean) return "paciente";
  return clean.split(/\s+/)[0];
}

function categoryLabel(category: "laboratory" | "image" | "procedure" | "interconsultation") {
  if (category === "image") return "Orden de imágenes ☢️";
  if (category === "procedure") return "Orden de procedimientos 🏥";
  if (category === "interconsultation") return "Orden de derivación 👁️";
  return "Orden de laboratorio 💉";
}

type EmailPdfAsset = {
  category: OrderCategory;
  fileName: string;
  blobUrl: string;
};

export async function sendSymptomsValidatedOrderEmail(
  requestId: string,
  input?: {
    assets?: EmailPdfAsset[];
  },
) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no está configurada.");
  }

  const request = await prisma.symptomsRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) {
    throw new Error("Solicitud de síntomas no encontrada.");
  }

  if (!request.patientEmail?.trim()) {
    throw new Error("La solicitud no tiene correo de paciente.");
  }

  let assets = input?.assets ?? [];
  if (assets.length === 0) {
    try {
      assets = await listSymptomsSignedPdfAssets(request.id);
    } catch (error) {
      console.error("No pudimos cargar assets firmados desde DB para correo de síntomas", {
        requestId: request.id,
        error,
      });
      assets = [];
    }
  }

  const patientName = joinPatientFullName({
    firstName: request.patientFirstName,
    paternalSurname: request.patientPaternalSurname,
    maternalSurname: request.patientMaternalSurname,
  });

  const appUrl =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.veramed.cl";

  const links =
    assets.length > 0
      ? assets
          .map((asset) => {
            const label = categoryLabel(asset.category);
            return `<li style="margin: 0 0 4px;"><a href="${escapeHtml(asset.blobUrl)}" style="color:#0f172a;font-weight:600;">${escapeHtml(label)}</a></li>`;
          })
          .join("")
      : `<li style="margin: 0 0 4px;"><a href="${escapeHtml(`${appUrl}/sintomas/orden?id=${request.id}`)}" style="color:#0f172a;font-weight:600;">Abrir orden en Veramed</a></li>`;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <p style="margin: 0 0 12px;">Hola ${escapeHtml(getFirstName(patientName))},</p>
      <p style="margin: 0 0 12px;">Tu orden de exámenes por síntomas ya fue validada y firmada por un médico de Veramed.</p>
      <p style="margin: 0 0 8px;">Puedes revisar tus órdenes en PDF:</p>
      <ul style="margin: 0 0 12px 18px; padding: 0;">
        ${links}
      </ul>
      <p style="margin: 0 0 12px;">Esperamos que tengas un gran día y sigas cuidando tu salud como hasta ahora.</p>
      <p style="margin: 0 0 12px;">Nuestros mejores deseos,</p>
      <p style="margin: 0 0 12px;">Equipo Veramed 👨🏻‍⚕️👩🏻‍⚕️</p>
      <p style="margin: 18px 0 8px; color: #64748b; font-size: 12px;">
        -----------------------------------------------------------------------------------
      </p>
      <p style="margin: 0; color: #475569; font-size: 13px;">
        Este correo fue enviado por el asistente automático de Veramed 🤖. No responder.
      </p>
    </div>
  `;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const sent = await resend.emails.send({
    from: FROM_EMAIL,
    to: [request.patientEmail.trim().toLowerCase()],
    subject: SUBJECT,
    html,
  });

  if (sent.error) {
    throw new Error(sent.error.message || "No pudimos enviar el correo.");
  }

  return {
    ok: true,
    messageId: sent.data?.id ?? null,
  };
}
