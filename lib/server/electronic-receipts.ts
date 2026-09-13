import "server-only";

import { del, get, put } from "@vercel/blob";
import {
  ClinicalRequestTypeDb,
  ElectronicReceiptStatusDb,
  type ElectronicReceipt,
} from "@prisma/client";
import { Resend } from "resend";
import { joinPatientFullName } from "@/lib/checkup";
import { prisma } from "@/lib/prisma";

export type ReceiptRequestType = "checkup" | "chronic_control" | "symptoms";

export type ReceiptWorkItem = {
  receiptId: string | null;
  requestType: ReceiptRequestType;
  requestId: string;
  serviceLabel: string;
  patientName: string;
  patientEmail: string;
  patientRut: string;
  paymentId: string;
  amount: number;
  currency: string;
  paidAt: string;
  eligibleAt: string;
  status: "pending" | "ready" | "sent";
  folio: string | null;
  fileName: string | null;
  uploadedAt: string | null;
  emailSentAt: string | null;
  lastEmailError: string | null;
};

type ReceiptSource = Omit<
  ReceiptWorkItem,
  | "receiptId"
  | "status"
  | "folio"
  | "fileName"
  | "uploadedAt"
  | "emailSentAt"
  | "lastEmailError"
>;

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const FROM_EMAIL = "Veramed <ordenes@mail.veramed.cl>";

function clean(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function patientName(input: {
  patientFirstName: string;
  patientPaternalSurname: string;
  patientMaternalSurname: string;
}) {
  return joinPatientFullName({
    firstName: input.patientFirstName,
    paternalSurname: input.patientPaternalSurname,
    maternalSurname: input.patientMaternalSurname,
  });
}

function toRequestType(value: ClinicalRequestTypeDb): ReceiptRequestType {
  return value as ReceiptRequestType;
}

function toStatus(value?: ElectronicReceipt | null): ReceiptWorkItem["status"] {
  if (value?.status === ElectronicReceiptStatusDb.sent) return "sent";
  if (value?.status === ElectronicReceiptStatusDb.ready) return "ready";
  return "pending";
}

function toWorkItem(source: ReceiptSource, receipt?: ElectronicReceipt | null): ReceiptWorkItem {
  return {
    ...source,
    receiptId: receipt?.id ?? null,
    status: toStatus(receipt),
    folio: receipt?.folio ?? null,
    fileName: receipt?.fileName ?? null,
    uploadedAt: receipt?.uploadedAt?.toISOString() ?? null,
    emailSentAt: receipt?.emailSentAt?.toISOString() ?? null,
    lastEmailError: receipt?.lastEmailError ?? null,
  };
}

export async function listReceiptWorkItems(): Promise<ReceiptWorkItem[]> {
  const [checkups, chronicControls, symptoms, receipts] = await Promise.all([
    prisma.checkupRequest.findMany({
      where: {
        reviewStatus: "approved",
        orderEmailSentAt: { not: null },
        payment: { is: { status: "paid" } },
      },
      include: { payment: true },
      orderBy: { orderEmailSentAt: "desc" },
      take: 250,
    }),
    prisma.chronicControlRequest.findMany({
      where: {
        reviewStatus: "approved",
        orderEmailSentAt: { not: null },
        payment: { is: { status: "paid" } },
      },
      include: { payment: true },
      orderBy: { orderEmailSentAt: "desc" },
      take: 250,
    }),
    prisma.symptomsRequest.findMany({
      where: {
        reviewStatus: "validated",
        payment: { is: { status: "paid" } },
      },
      include: { payment: true },
      orderBy: { validatedAt: "desc" },
      take: 250,
    }),
    prisma.electronicReceipt.findMany({ orderBy: { createdAt: "desc" }, take: 1_000 }),
  ]);

  const sources: ReceiptSource[] = [
    ...checkups.flatMap((request) => request.payment ? [{
      requestType: "checkup" as const,
      requestId: request.id,
      serviceLabel: "Chequeo preventivo",
      patientName: patientName(request),
      patientEmail: clean(request.patientEmail).toLowerCase(),
      patientRut: clean(request.patientRut),
      paymentId: request.payment.paymentId,
      amount: request.payment.amount,
      currency: request.payment.currency,
      paidAt: (request.payment.paidAt ?? request.payment.updatedAt).toISOString(),
      eligibleAt: (request.orderEmailSentAt ?? request.approvedAt ?? request.updatedAt).toISOString(),
    }] : []),
    ...chronicControls.flatMap((request) => request.payment ? [{
      requestType: "chronic_control" as const,
      requestId: request.id,
      serviceLabel: "Control de enfermedades",
      patientName: patientName(request),
      patientEmail: clean(request.patientEmail).toLowerCase(),
      patientRut: clean(request.patientRut),
      paymentId: request.payment.paymentId,
      amount: request.payment.amount,
      currency: request.payment.currency,
      paidAt: (request.payment.paidAt ?? request.payment.updatedAt).toISOString(),
      eligibleAt: (request.orderEmailSentAt ?? request.approvedAt ?? request.updatedAt).toISOString(),
    }] : []),
    ...symptoms.flatMap((request) => request.payment ? [{
      requestType: "symptoms" as const,
      requestId: request.id,
      serviceLabel: "Evaluación de síntomas con IA",
      patientName: patientName(request),
      patientEmail: clean(request.patientEmail).toLowerCase(),
      patientRut: clean(request.patientRut),
      paymentId: request.payment.paymentId,
      amount: request.payment.amount,
      currency: request.payment.currency,
      paidAt: (request.payment.paidAt ?? request.payment.updatedAt).toISOString(),
      eligibleAt: (request.orderEmailSentAt ?? request.validatedAt ?? request.updatedAt).toISOString(),
    }] : []),
  ];

  const receiptByRequest = new Map(
    receipts.map((receipt) => [
      `${toRequestType(receipt.requestType)}:${receipt.requestId}`,
      receipt,
    ]),
  );

  return sources
    .map((source) => toWorkItem(
      source,
      receiptByRequest.get(`${source.requestType}:${source.requestId}`),
    ))
    .sort((left, right) => Date.parse(right.eligibleAt) - Date.parse(left.eligibleAt));
}

export async function getEligibleReceiptSource(
  requestType: ReceiptRequestType,
  requestId: string,
): Promise<ReceiptSource | null> {
  const items = await listReceiptWorkItems();
  const item = items.find(
    (candidate) => candidate.requestType === requestType && candidate.requestId === requestId,
  );
  if (!item) return null;
  return {
    requestType: item.requestType,
    requestId: item.requestId,
    serviceLabel: item.serviceLabel,
    patientName: item.patientName,
    patientEmail: item.patientEmail,
    patientRut: item.patientRut,
    paymentId: item.paymentId,
    amount: item.amount,
    currency: item.currency,
    paidAt: item.paidAt,
    eligibleAt: item.eligibleAt,
  };
}

function normalizedFileName(folio: string) {
  const safeFolio = folio.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `boleta-exenta-veramed-${safeFolio}.pdf`;
}

export async function saveElectronicReceipt(input: {
  requestType: ReceiptRequestType;
  requestId: string;
  folio: string;
  file: File;
  uploadedByUserId: string;
}) {
  const folio = input.folio.trim();
  if (!folio || folio.length > 30 || !/^[a-zA-Z0-9.-]+$/.test(folio)) {
    throw new Error("Ingresa un folio válido de hasta 30 caracteres.");
  }
  if (input.file.size <= 0 || input.file.size > MAX_RECEIPT_BYTES) {
    throw new Error("El PDF debe pesar entre 1 byte y 10 MB.");
  }
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  const signature = new TextDecoder().decode(bytes.slice(0, 5));
  if (signature !== "%PDF-") {
    throw new Error("El archivo seleccionado no es un PDF válido.");
  }

  const source = await getEligibleReceiptSource(input.requestType, input.requestId);
  if (!source) {
    throw new Error("La solicitud no está lista para emitir su boleta.");
  }
  if (!source.patientEmail) {
    throw new Error("La solicitud no tiene un correo de paciente válido.");
  }

  const privateBlobToken = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN?.trim();
  if (!privateBlobToken) {
    throw new Error("El almacenamiento privado no está configurado.");
  }

  const existing = await prisma.electronicReceipt.findUnique({
    where: {
      requestType_requestId: {
        requestType: input.requestType as ClinicalRequestTypeDb,
        requestId: input.requestId,
      },
    },
  });
  const fileName = normalizedFileName(folio);
  const blobPath = `private/boletas/${input.requestType}/${input.requestId}/${fileName}`;
  const blob = await put(blobPath, Buffer.from(bytes), {
    access: "private",
    contentType: "application/pdf",
    addRandomSuffix: false,
    allowOverwrite: true,
    token: privateBlobToken,
  });

  const receipt = await prisma.electronicReceipt.upsert({
    where: {
      requestType_requestId: {
        requestType: input.requestType as ClinicalRequestTypeDb,
        requestId: input.requestId,
      },
    },
    update: {
      paymentId: source.paymentId,
      amount: source.amount,
      currency: source.currency,
      serviceLabel: source.serviceLabel,
      patientName: source.patientName,
      patientEmail: source.patientEmail,
      patientRut: source.patientRut || null,
      status: ElectronicReceiptStatusDb.ready,
      folio,
      fileName,
      blobUrl: blob.url,
      blobPath: blob.pathname,
      sizeBytes: bytes.byteLength,
      issuedAt: new Date(),
      uploadedAt: new Date(),
      uploadedByUserId: input.uploadedByUserId,
      emailSentAt: null,
      emailMessageId: null,
      lastEmailError: null,
    },
    create: {
      requestType: input.requestType as ClinicalRequestTypeDb,
      requestId: input.requestId,
      paymentId: source.paymentId,
      amount: source.amount,
      currency: source.currency,
      serviceLabel: source.serviceLabel,
      patientName: source.patientName,
      patientEmail: source.patientEmail,
      patientRut: source.patientRut || null,
      status: ElectronicReceiptStatusDb.ready,
      folio,
      fileName,
      blobUrl: blob.url,
      blobPath: blob.pathname,
      sizeBytes: bytes.byteLength,
      issuedAt: new Date(),
      uploadedAt: new Date(),
      uploadedByUserId: input.uploadedByUserId,
    },
  });

  if (existing?.blobUrl && existing.blobUrl !== blob.url) {
    await del(existing.blobUrl, { token: privateBlobToken }).catch((error) => {
      console.error("No pudimos eliminar la boleta reemplazada", { receiptId: existing.id, error });
    });
  }

  return receipt;
}

async function readReceiptPdf(receipt: ElectronicReceipt) {
  if (!receipt.blobPath || !receipt.fileName) {
    throw new Error("La boleta todavía no tiene un PDF asociado.");
  }
  const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) throw new Error("El almacenamiento privado no está configurado.");
  const blob = await get(receipt.blobPath, { access: "private", useCache: false, token });
  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    throw new Error("No pudimos recuperar el PDF de la boleta.");
  }
  const content = Buffer.from(await new Response(blob.stream).arrayBuffer());
  return { content, fileName: receipt.fileName };
}

export async function openElectronicReceiptPdf(receiptId: string) {
  const receipt = await prisma.electronicReceipt.findUnique({ where: { id: receiptId } });
  if (!receipt) throw new Error("Boleta no encontrada.");
  return readReceiptPdf(receipt);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendElectronicReceiptEmail(receiptId: string) {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY no está configurada.");
  const receipt = await prisma.electronicReceipt.findUnique({ where: { id: receiptId } });
  if (!receipt) throw new Error("Boleta no encontrada.");
  if (receipt.status === ElectronicReceiptStatusDb.sent && receipt.emailSentAt) {
    return { receipt, deduped: true };
  }
  if (!receipt.folio || receipt.status !== ElectronicReceiptStatusDb.ready) {
    throw new Error("La boleta todavía no está lista para enviar.");
  }

  const { content, fileName } = await readReceiptPdf(receipt);
  const firstName = receipt.patientName.trim().split(/\s+/)[0] || "paciente";
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6">
      <p>Hola ${escapeHtml(firstName)},</p>
      <p>Adjuntamos la boleta electrónica exenta correspondiente a tu compra en Veramed.</p>
      <p><strong>Servicio:</strong> ${escapeHtml(receipt.serviceLabel)}<br />
      <strong>Folio:</strong> ${escapeHtml(receipt.folio)}<br />
      <strong>Monto:</strong> $${receipt.amount.toLocaleString("es-CL")}</p>
      <p>Saludos,<br />Equipo Veramed</p>
      <p style="margin-top:18px;color:#64748b;font-size:12px">Este correo fue enviado automáticamente. No responder.</p>
    </div>
  `;

  try {
    const sent = await new Resend(process.env.RESEND_API_KEY).emails.send(
      {
        from: FROM_EMAIL,
        to: [receipt.patientEmail],
        subject: `Tu boleta electrónica de Veramed · Folio ${receipt.folio}`,
        html,
        attachments: [{ content, filename: fileName, contentType: "application/pdf" }],
      },
      { idempotencyKey: `electronic-receipt-${receipt.id}` },
    );
    if (sent.error) throw new Error(sent.error.message || "No pudimos enviar la boleta.");
    const updated = await prisma.electronicReceipt.update({
      where: { id: receipt.id },
      data: {
        status: ElectronicReceiptStatusDb.sent,
        emailSentAt: new Date(),
        emailMessageId: sent.data?.id ?? null,
        lastEmailError: null,
      },
    });
    return { receipt: updated, deduped: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pudimos enviar la boleta.";
    await prisma.electronicReceipt.update({
      where: { id: receipt.id },
      data: { lastEmailError: message.slice(0, 1_000) },
    });
    throw error;
  }
}
