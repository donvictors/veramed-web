import "server-only";

import { prisma } from "@/lib/prisma";

export type OrderVerificationResult = {
  found: boolean;
  valid: boolean;
  code: string;
  documentType?: "Receta médica";
  status?: "Vigente" | "Revocada";
  issuedAt?: string;
  prescriberName?: string;
  prescriberSpecialty?: string;
  itemCount?: number;
};

export function normalizeVerificationCode(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export async function verifyMedicalOrderCode(rawCode: string): Promise<OrderVerificationResult> {
  const code = normalizeVerificationCode(rawCode);

  if (!/^RX-\d{8}-[A-Z0-9]{4,32}$/.test(code)) {
    return { found: false, valid: false, code };
  }

  const prescription = await prisma.medicalPrescription.findUnique({
    where: { verificationCode: code },
    select: {
      verificationCode: true,
      status: true,
      revokedAt: true,
      signedAt: true,
      prescriberName: true,
      prescriberSpecialty: true,
      items: true,
    },
  });

  if (!prescription) {
    return { found: false, valid: false, code };
  }

  const revoked = prescription.status === "revoked" || Boolean(prescription.revokedAt);
  const itemCount = Array.isArray(prescription.items) ? prescription.items.length : 0;

  return {
    found: true,
    valid: !revoked,
    code: prescription.verificationCode,
    documentType: "Receta médica",
    status: revoked ? "Revocada" : "Vigente",
    issuedAt: prescription.signedAt.toISOString(),
    prescriberName: prescription.prescriberName,
    prescriberSpecialty: prescription.prescriberSpecialty || undefined,
    itemCount,
  };
}
