import "server-only";

import { randomBytes } from "node:crypto";
import { MedicalPortalRoleDb } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashOpaqueToken } from "@/lib/server/http-security";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createMedicalInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function medicalInvitationTokenHash(token: string) {
  return hashOpaqueToken(token);
}

export function getMedicalInvitationExpiry() {
  return new Date(Date.now() + INVITATION_TTL_MS);
}

export function medicalRoleLabel(role: MedicalPortalRoleDb) {
  if (role === MedicalPortalRoleDb.admin) return "Coadministrador";
  if (role === MedicalPortalRoleDb.doctor) return "Validador de órdenes";
  return "Acceso al portal";
}

export async function findActiveMedicalInvitation(rawToken: string) {
  if (!rawToken || rawToken.length > 200) return null;
  return prisma.medicalPortalInvitation.findFirst({
    where: {
      tokenHash: medicalInvitationTokenHash(rawToken),
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}
