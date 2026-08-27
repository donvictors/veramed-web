import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export type MedicalSignerIdentity = {
  name: string;
  rut: string;
  sisRegistration: string;
  email?: string;
};

export type AutomaticApprovalRequestType = "checkup" | "chronic_control";
export type ClinicalRequestType = AutomaticApprovalRequestType | "symptoms";

const DEFAULT_SIGNER: MedicalSignerIdentity = {
  name: "Dr. Víctor Rebolledo M.",
  rut: "18.856.820-3",
  sisRegistration: "611341",
};

const DEFAULT_PROTOCOL_VERSIONS: Record<AutomaticApprovalRequestType, string> = {
  checkup: "veramed-checkup-preventivo-v1",
  chronic_control: "veramed-control-cronico-v1",
};

export function getConfiguredMedicalSigner(): MedicalSignerIdentity {
  return {
    name: process.env.MEDICAL_SIGNER_NAME?.trim() || DEFAULT_SIGNER.name,
    rut: process.env.MEDICAL_SIGNER_RUT?.trim() || DEFAULT_SIGNER.rut,
    sisRegistration:
      process.env.MEDICAL_SIGNER_SIS?.trim() || DEFAULT_SIGNER.sisRegistration,
    email:
      process.env.MEDICAL_SIGNER_EMAIL?.trim().toLowerCase() ||
      process.env.MEDICOS_PORTAL_EMAIL?.trim().toLowerCase() ||
      undefined,
  };
}

export function getAutomaticApprovalAttribution(requestType: AutomaticApprovalRequestType) {
  const signer = getConfiguredMedicalSigner();
  const envProtocol =
    requestType === "checkup"
      ? process.env.CHECKUP_APPROVAL_PROTOCOL_VERSION
      : process.env.CHRONIC_APPROVAL_PROTOCOL_VERSION;

  return {
    approvedByName: signer.name,
    approvedByRut: signer.rut,
    approvedBySis: signer.sisRegistration,
    approvedByEmail: signer.email ?? null,
    approvalMethod: "automatic_protocol" as const,
    approvalProtocolVersion:
      envProtocol?.trim() || DEFAULT_PROTOCOL_VERSIONS[requestType],
  };
}

export function signerFromApproval(input: {
  approvedByName?: string | null;
  approvedByRut?: string | null;
  approvedBySis?: string | null;
  approvedByEmail?: string | null;
}): MedicalSignerIdentity | null {
  const name = input.approvedByName?.trim();
  const rut = input.approvedByRut?.trim();
  const sisRegistration = input.approvedBySis?.trim();

  if (!name || !rut || !sisRegistration) {
    return null;
  }

  return {
    name,
    rut,
    sisRegistration,
    email: input.approvedByEmail?.trim().toLowerCase() || undefined,
  };
}

export async function getApprovedMedicalSigner(
  requestType: ClinicalRequestType,
  requestId: string,
): Promise<MedicalSignerIdentity | null> {
  if (requestType === "checkup") {
    const row = await prisma.checkupRequest.findUnique({
      where: { id: requestId },
      select: {
        reviewStatus: true,
        approvedByName: true,
        approvedByRut: true,
        approvedBySis: true,
        approvedByEmail: true,
        payment: { select: { status: true } },
      },
    });
    if (row?.reviewStatus !== "approved" || row.payment?.status !== "paid") return null;
    const existingSigner = signerFromApproval(row);
    if (existingSigner) return existingSigner;
    const attribution = getAutomaticApprovalAttribution("checkup");
    await prisma.checkupRequest.updateMany({
      where: { id: requestId, reviewStatus: "approved", approvedBySis: null },
      data: attribution,
    });
    return signerFromApproval(attribution);
  }

  if (requestType === "chronic_control") {
    const row = await prisma.chronicControlRequest.findUnique({
      where: { id: requestId },
      select: {
        reviewStatus: true,
        approvedByName: true,
        approvedByRut: true,
        approvedBySis: true,
        approvedByEmail: true,
        payment: { select: { status: true } },
      },
    });
    if (row?.reviewStatus !== "approved" || row.payment?.status !== "paid") return null;
    const existingSigner = signerFromApproval(row);
    if (existingSigner) return existingSigner;
    const attribution = getAutomaticApprovalAttribution("chronic_control");
    await prisma.chronicControlRequest.updateMany({
      where: { id: requestId, reviewStatus: "approved", approvedBySis: null },
      data: attribution,
    });
    return signerFromApproval(attribution);
  }

  const row = await prisma.symptomsRequest.findUnique({
    where: { id: requestId },
    select: {
      reviewStatus: true,
      validatedByEmail: true,
      validatedByName: true,
      validatedByRut: true,
      validatedBySis: true,
      payment: { select: { status: true } },
    },
  });

  if (
    row?.reviewStatus !== "validated" ||
    row.payment?.status !== "paid" ||
    !row.validatedByEmail
  ) {
    return null;
  }

  const attributed = signerFromApproval({
    approvedByName: row.validatedByName,
    approvedByRut: row.validatedByRut,
    approvedBySis: row.validatedBySis,
    approvedByEmail: row.validatedByEmail,
  });
  if (attributed) return attributed;

  // Compatibilidad para órdenes validadas antes de guardar identidad médica completa.
  const legacySigner = { ...getConfiguredMedicalSigner(), email: row.validatedByEmail };
  await prisma.symptomsRequest.updateMany({
    where: { id: requestId, reviewStatus: "validated", validatedBySis: null },
    data: {
      validatedByName: legacySigner.name,
      validatedByRut: legacySigner.rut,
      validatedBySis: legacySigner.sisRegistration,
    },
  });
  return legacySigner;
}

export async function requireApprovedMedicalSigner(
  requestType: ClinicalRequestType,
  requestId: string,
) {
  const signer = await getApprovedMedicalSigner(requestType, requestId);
  if (!signer) {
    throw new Error(
      "La orden requiere pago confirmado y aprobación médica atribuible antes de firmarse.",
    );
  }
  return signer;
}

export async function loadProtectedMedicalSignature() {
  const base64 = process.env.MEDICAL_SIGNATURE_BASE64?.trim();
  if (base64) {
    return Buffer.from(base64.replace(/^data:image\/png;base64,/i, ""), "base64");
  }

  const configuredPath = process.env.MEDICAL_SIGNATURE_PATH?.trim();
  const imagePath = configuredPath
    ? path.resolve(configuredPath)
    : path.join(process.cwd(), "server-assets", "firmas", "firma-VRM.png");
  return readFile(imagePath);
}
