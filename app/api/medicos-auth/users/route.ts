import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { MedicalPortalRoleDb } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  MEDICAL_PORTAL_SESSION_COOKIE,
  recordMedicalAudit,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";
import { hashPassword } from "@/lib/server/password-hashing";
import { httpErrorResponse, readJsonBody, requireSameOrigin } from "@/lib/server/http-security";

const createSchema = z.object({
  email: z.email().max(254),
  name: z.string().trim().min(2).max(160),
  medicalRut: z.string().trim().min(8).max(20),
  sisRegistration: z.string().trim().min(3).max(30),
  password: z.string().min(12).max(200),
  role: z.enum(["doctor", "admin"]).default("doctor"),
});

const updateSchema = z.object({
  userId: z.string().min(1).max(100),
  active: z.boolean(),
});

async function adminSession() {
  const cookieStore = await cookies();
  const session = await verifyMedicalPortalSessionToken(
    cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value,
  );
  return session?.role === "admin" ? session : null;
}

export async function GET() {
  const session = await adminSession();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const users = await prisma.medicalPortalUser.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      mfaEnabled: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await adminSession();
    if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const parsed = createSchema.safeParse(await readJsonBody(request, 8_000));
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    const { hash, salt } = hashPassword(parsed.data.password);
    const user = await prisma.medicalPortalUser.create({
      data: {
        email: parsed.data.email.trim().toLowerCase(),
        name: parsed.data.name,
        medicalRut: parsed.data.medicalRut,
        sisRegistration: parsed.data.sisRegistration,
        role: parsed.data.role as MedicalPortalRoleDb,
        passwordHash: hash,
        passwordSalt: salt,
      },
      select: { id: true, email: true, name: true, role: true, active: true },
    });
    await recordMedicalAudit({
      session,
      action: "medical.user_created",
      request,
      metadata: { targetUserId: user.id, role: user.role },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos crear el usuario médico.");
  }
}

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await adminSession();
    if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const parsed = updateSchema.safeParse(await readJsonBody(request, 4_000));
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    if (parsed.data.userId === session.userId && !parsed.data.active) {
      return NextResponse.json({ error: "No puedes desactivar tu propio usuario." }, { status: 409 });
    }
    await prisma.$transaction([
      prisma.medicalPortalUser.update({
        where: { id: parsed.data.userId },
        data: { active: parsed.data.active },
      }),
      prisma.medicalPortalSession.updateMany({
        where: { userId: parsed.data.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await recordMedicalAudit({
      session,
      action: parsed.data.active ? "medical.user_activated" : "medical.user_deactivated",
      request,
      metadata: { targetUserId: parsed.data.userId },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos actualizar el usuario médico.");
  }
}
