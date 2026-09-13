import "server-only";

import { randomBytes } from "node:crypto";
import { get, put } from "@vercel/blob";
import { MedicalPrescriptionStatusDb, Prisma } from "@prisma/client";
import { Resend } from "resend";
import { formatRut, isValidRut, normalizeRut } from "@/lib/checkup";
import { prisma } from "@/lib/prisma";
import {
  prescriptionPatientFullName,
  type PrescriptionItemInput,
  type PrescriptionPatientInput,
} from "@/lib/prescriptions";
import { getConfiguredMedicalSigner, loadProtectedMedicalSignature } from "@/lib/server/medical-approval";
import type { MedicalPortalSessionIdentity } from "@/lib/server/medical-portal-auth";
import { buildMedicalPrescriptionPdf } from "@/lib/server/prescription-pdf";

const FROM_EMAIL = "Veramed <ordenes@mail.veramed.cl>";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function prescriptionCode() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `RX-${date}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function prescriptionId() {
  return `rx_${randomBytes(12).toString("base64url")}`;
}

function privateBlobToken() {
  const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) throw new Error("El almacenamiento privado de recetas no está configurado.");
  return token;
}

function requirePrescriberIdentity(session: MedicalPortalSessionIdentity) {
  if (!session.medicalRut?.trim() || !session.sisRegistration?.trim()) {
    throw new Error("Completa tu RUT médico y registro SIS en tu perfil antes de emitir recetas.");
  }
  return {
    name: session.name,
    rut: session.medicalRut.trim(),
    sisRegistration: session.sisRegistration.trim(),
    email: session.email,
    specialty: session.specialty?.trim() || "",
  };
}

export async function findPrescriptionPatientByRut(rut: string) {
  if (!isValidRut(rut)) return null;
  const formattedRut = formatRut(normalizeRut(rut));
  const user = await prisma.user.findFirst({
    where: { profileRut: formattedRut },
    select: {
      id: true,
      profileFirstName: true,
      profilePaternalSurname: true,
      profileMaternalSurname: true,
      profileRut: true,
      profileBirthDate: true,
      profileEmail: true,
      profilePhone: true,
      profileAddress: true,
    },
  });
  if (!user) return null;
  return {
    userId: user.id,
    firstName: user.profileFirstName,
    paternalSurname: user.profilePaternalSurname,
    maternalSurname: user.profileMaternalSurname,
    rut: user.profileRut,
    birthDate: user.profileBirthDate,
    email: user.profileEmail,
    phone: user.profilePhone,
    address: user.profileAddress,
  } satisfies PrescriptionPatientInput;
}

export async function listMedicalPrescriptions(session: MedicalPortalSessionIdentity) {
  const rows = await prisma.medicalPrescription.findMany({
    where: session.role === "admin" ? undefined : { prescriberUserId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      patientFirstName: true,
      patientPaternalSurname: true,
      patientMaternalSurname: true,
      patientRut: true,
      verificationCode: true,
      status: true,
      signedAt: true,
      prescriberUserId: true,
    },
  });
  return rows.map((row) => ({
    ...row,
    patientName: prescriptionPatientFullName({
      firstName: row.patientFirstName,
      paternalSurname: row.patientPaternalSurname,
      maternalSurname: row.patientMaternalSurname,
    }),
    signedAt: row.signedAt.getTime(),
    canDownload: session.role === "admin" || row.prescriberUserId === session.userId,
  }));
}

export async function issueMedicalPrescription(input: {
  session: MedicalPortalSessionIdentity;
  patient: PrescriptionPatientInput;
  items: PrescriptionItemInput[];
}) {
  const patientAccount = await prisma.user.findUnique({
    where: { id: input.patient.userId },
    select: { id: true, profileRut: true },
  });
  if (!patientAccount || normalizeRut(patientAccount.profileRut) !== normalizeRut(input.patient.rut)) {
    throw new Error("La identidad del paciente no coincide con la cuenta seleccionada.");
  }
  if (!isValidRut(input.patient.rut)) throw new Error("El RUT del paciente no es válido.");

  const prescriber = requirePrescriberIdentity(input.session);
  const id = prescriptionId();
  const verificationCode = prescriptionCode();
  const signedAt = new Date();
  const configuredSignerEmail = getConfiguredMedicalSigner().email?.toLowerCase();
  const signatureBytes = configuredSignerEmail === input.session.email.toLowerCase()
    ? await loadProtectedMedicalSignature().catch(() => null)
    : null;
  const pdf = await buildMedicalPrescriptionPdf({
    patient: { ...input.patient, rut: formatRut(normalizeRut(input.patient.rut)) },
    items: input.items,
    prescriber,
    verificationCode,
    issuedAt: signedAt,
    signatureBytes,
  });
  const fileName = `receta-${verificationCode.toLowerCase()}.pdf`;
  const blobPath = `private/recetas/v1/${input.session.userId}/${id}/${fileName}`;
  const blob = await put(blobPath, pdf, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: "application/pdf",
    token: privateBlobToken(),
  });

  const patient = { ...input.patient, rut: formatRut(normalizeRut(input.patient.rut)) };
  const created = await prisma.medicalPrescription.create({
    data: {
      id,
      prescriberUserId: input.session.userId,
      patientUserId: patient.userId,
      patientFirstName: patient.firstName,
      patientPaternalSurname: patient.paternalSurname,
      patientMaternalSurname: patient.maternalSurname,
      patientRut: patient.rut,
      patientBirthDate: patient.birthDate,
      patientEmail: patient.email,
      patientPhone: patient.phone,
      patientAddress: patient.address,
      prescriberName: prescriber.name,
      prescriberRut: prescriber.rut,
      prescriberSis: prescriber.sisRegistration,
      prescriberEmail: prescriber.email,
      prescriberSpecialty: prescriber.specialty,
      items: input.items as unknown as Prisma.InputJsonValue,
      verificationCode,
      status: MedicalPrescriptionStatusDb.signed,
      fileName,
      blobUrl: blob.url,
      blobPath: blob.pathname,
      sizeBytes: pdf.byteLength,
      signedAt,
    },
  });

  let emailSent = false;
  let emailError = "";
  let messageId: string | null = null;
  try {
    if (!process.env.RESEND_API_KEY) throw new Error("El servicio de correo no está configurado.");
    const firstName = patient.firstName.trim() || "paciente";
    const resend = new Resend(process.env.RESEND_API_KEY);
    const sent = await resend.emails.send({
      from: FROM_EMAIL,
      to: [patient.email],
      subject: "Tu receta médica está lista 💊",
      html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6"><p>Hola ${escapeHtml(firstName)},</p><p>${escapeHtml(prescriber.name)} emitió una receta médica para ti a través de Veramed. La encontrarás adjunta a este correo.</p><p>Revisa las indicaciones y consulta directamente con el profesional si tienes dudas antes de iniciar el tratamiento.</p><p>Equipo Veramed 👨🏻‍⚕️👩🏻‍⚕️</p><hr style="border:0;border-top:1px solid #e2e8f0"><p style="font-size:12px;color:#64748b">Código de verificación: ${escapeHtml(verificationCode)}. Este correo fue enviado automáticamente; no responder.</p></div>`,
      attachments: [{ filename: fileName, content: pdf }],
    });
    if (sent.error) throw new Error(sent.error.message || "No pudimos enviar el correo.");
    messageId = sent.data?.id ?? null;
    emailSent = true;
    await prisma.medicalPrescription.update({
      where: { id: created.id },
      data: {
        status: MedicalPrescriptionStatusDb.sent,
        emailSentAt: new Date(),
        emailMessageId: messageId,
        emailError: null,
      },
    });
  } catch (error) {
    emailError = error instanceof Error ? error.message : "No pudimos enviar el correo.";
    await prisma.medicalPrescription.update({
      where: { id: created.id },
      data: {
        status: MedicalPrescriptionStatusDb.email_failed,
        emailError: emailError.slice(0, 500),
      },
    });
  }

  return { id: created.id, verificationCode, emailSent, emailError, messageId };
}

export async function openMedicalPrescriptionPdf(
  id: string,
  session: MedicalPortalSessionIdentity,
) {
  const prescription = await prisma.medicalPrescription.findUnique({ where: { id } });
  if (!prescription || prescription.revokedAt || prescription.status === "revoked") return null;
  if (session.role !== "admin" && prescription.prescriberUserId !== session.userId) return null;
  const blob = await get(prescription.blobPath, {
    access: "private",
    useCache: false,
    token: privateBlobToken(),
  });
  if (!blob || blob.statusCode !== 200 || !blob.stream) return null;
  return {
    stream: blob.stream,
    fileName: prescription.fileName,
    prescription,
    contentType: blob.blob.contentType || "application/pdf",
  };
}
