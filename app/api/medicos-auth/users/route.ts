import { MedicalPortalRoleDb } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  canManageMedicalUsers,
  isPrimaryMedicalAdmin,
  MEDICAL_PORTAL_SESSION_COOKIE,
  recordMedicalAudit,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";
import { httpErrorResponse, readJsonBody, requireSameOrigin } from "@/lib/server/http-security";

const updateSchema = z.object({
  userId: z.string().min(1).max(100),
  name: z.string().trim().min(2).max(160),
  medicalRut: z.string().trim().min(8).max(20),
  sisRegistration: z.string().trim().min(3).max(30),
  role: z.enum(["portal", "doctor", "admin"]),
  active: z.boolean(),
});

async function adminSession() {
  const cookieStore = await cookies();
  const session = await verifyMedicalPortalSessionToken(
    cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value,
  );
  return session && canManageMedicalUsers(session) ? session : null;
}

export async function GET(request: Request) {
  const session = await adminSession();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const canViewPatients = isPrimaryMedicalAdmin(session.email);
  const [users, invitations, patients] = await Promise.all([
    prisma.medicalPortalUser.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        medicalRut: true,
        sisRegistration: true,
        role: true,
        active: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    prisma.medicalPortalInvitation.findMany({
      where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
    }),
    canViewPatients
      ? prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, email: true, createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  await recordMedicalAudit({
    session,
    action: "medical.users_listed",
    request,
    metadata: { patientListViewed: canViewPatients, patientCount: patients.length },
  });

  return NextResponse.json(
    {
      users: users.map((user) => ({
        ...user,
        isPrimaryAdmin: isPrimaryMedicalAdmin(user.email),
        isCurrentUser: user.id === session.userId,
      })),
      invitations,
      patients,
      canViewPatients,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await adminSession();
    if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

    const parsed = updateSchema.safeParse(await readJsonBody(request, 8_000));
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

    const current = await prisma.medicalPortalUser.findUnique({ where: { id: parsed.data.userId } });
    if (!current) return NextResponse.json({ error: "Usuario médico no encontrado." }, { status: 404 });

    const targetIsPrimary = isPrimaryMedicalAdmin(current.email);
    if (targetIsPrimary && !isPrimaryMedicalAdmin(session.email)) {
      return NextResponse.json(
        { error: "La cuenta administradora principal está protegida." },
        { status: 403 },
      );
    }
    if (targetIsPrimary && (!parsed.data.active || parsed.data.role !== "admin")) {
      return NextResponse.json(
        { error: "No se puede desactivar ni cambiar el rol del administrador principal." },
        { status: 409 },
      );
    }
    if (current.id === session.userId && (!parsed.data.active || parsed.data.role !== current.role)) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propia cuenta ni cambiar tu propio rol." },
        { status: 409 },
      );
    }

    const accessChanged = current.active !== parsed.data.active || current.role !== parsed.data.role;
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.medicalPortalUser.update({
        where: { id: current.id },
        data: {
          name: parsed.data.name,
          medicalRut: parsed.data.medicalRut,
          sisRegistration: parsed.data.sisRegistration,
          role: parsed.data.role as MedicalPortalRoleDb,
          active: parsed.data.active,
        },
        select: {
          id: true,
          email: true,
          name: true,
          medicalRut: true,
          sisRegistration: true,
          role: true,
          active: true,
          mfaEnabled: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });
      if (accessChanged) {
        await tx.medicalPortalSession.updateMany({
          where: { userId: current.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return user;
    });

    await recordMedicalAudit({
      session,
      action: "medical.user_updated",
      request,
      metadata: {
        targetUserId: updated.id,
        role: updated.role,
        active: updated.active,
        sessionsRevoked: accessChanged,
      },
    });

    return NextResponse.json({
      user: {
        ...updated,
        isPrimaryAdmin: isPrimaryMedicalAdmin(updated.email),
        isCurrentUser: updated.id === session.userId,
      },
    });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos actualizar el usuario médico.");
  }
}
