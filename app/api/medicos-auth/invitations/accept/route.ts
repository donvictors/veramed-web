import { MedicalPortalRoleDb, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findActiveMedicalInvitation } from "@/lib/server/medical-invitations";
import {
  enforceRateLimit,
  getRequestIpHash,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";
import { hashPassword } from "@/lib/server/password-hashing";
import { splitMedicalPortalName } from "@/lib/medical-portal/profile";

const inspectSchema = z.object({ token: z.string().min(20).max(200) });
const acceptSchema = inspectSchema.extend({
  name: z.string().trim().min(3).max(160),
  medicalRut: z.string().trim().min(8).max(20),
  sisRegistration: z.string().trim().min(3).max(30),
  password: z.string().min(12).max(200),
});

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  const parsed = inspectSchema.safeParse({ token });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invitación inválida o expirada." }, { status: 400 });
  }
  const invitation = await findActiveMedicalInvitation(parsed.data.token);
  if (!invitation) {
    return NextResponse.json({ error: "Invitación inválida o expirada." }, { status: 404 });
  }
  return NextResponse.json(
    { email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await enforceRateLimit({
      request,
      action: "medical-auth:accept-invitation",
      limit: 8,
      windowMs: 60 * 60 * 1000,
    });
    const parsed = acceptSchema.safeParse(await readJsonBody(request, 8_000));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Completa tus datos y usa una contraseña de al menos 12 caracteres." },
        { status: 400 },
      );
    }

    const invitation = await findActiveMedicalInvitation(parsed.data.token);
    if (!invitation) {
      return NextResponse.json({ error: "Invitación inválida o expirada." }, { status: 400 });
    }
    const { hash, salt } = hashPassword(parsed.data.password);
    const nameFields = splitMedicalPortalName(parsed.data.name);
    const now = new Date();

    const user = await prisma.$transaction(async (tx) => {
      const claimed = await tx.medicalPortalInvitation.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { acceptedAt: now },
      });
      if (claimed.count !== 1) throw new Error("INVITATION_ALREADY_USED");

      const created = await tx.medicalPortalUser.create({
        data: {
          email: invitation.email,
          name: parsed.data.name,
          ...nameFields,
          medicalRut: parsed.data.medicalRut,
          sisRegistration: parsed.data.sisRegistration,
          role: invitation.role as MedicalPortalRoleDb,
          passwordHash: hash,
          passwordSalt: salt,
          active: true,
        },
      });
      await tx.medicalAuditLog.create({
        data: {
          userId: created.id,
          actorEmail: created.email,
          action: "medical.invitation_accepted",
          ipHash: getRequestIpHash(request),
          metadata: { invitationId: invitation.id, role: invitation.role },
        },
      });
      return created;
    });

    return NextResponse.json(
      { ok: true, email: user.email },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (
      (error instanceof Error && error.message === "INVITATION_ALREADY_USED") ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
    ) {
      return NextResponse.json(
        { error: "La invitación ya fue utilizada o la cuenta ya existe." },
        { status: 409 },
      );
    }
    return httpErrorResponse(error, "No pudimos crear la cuenta médica.");
  }
}
