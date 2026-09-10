import { MedicalPortalRoleDb } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  canManageMedicalUsers,
  MEDICAL_PORTAL_SESSION_COOKIE,
  recordMedicalAudit,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";
import {
  createMedicalInvitationToken,
  getMedicalInvitationExpiry,
  medicalInvitationTokenHash,
  medicalRoleLabel,
} from "@/lib/server/medical-invitations";
import {
  enforceRateLimit,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";

const schema = z.object({
  email: z.email().max(254),
  role: z.enum(["portal", "doctor", "admin"]),
});

function appBaseUrl(request: Request) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character] ?? character;
  });
}

async function adminSession() {
  const cookieStore = await cookies();
  const session = await verifyMedicalPortalSessionToken(
    cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value,
  );
  return session && canManageMedicalUsers(session) ? session : null;
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await adminSession();
    if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

    await enforceRateLimit({
      request,
      action: "medical-admin:invite",
      subject: session.userId,
      limit: 30,
      windowMs: 24 * 60 * 60 * 1000,
    });

    const parsed = schema.safeParse(await readJsonBody(request, 4_000));
    if (!parsed.success) {
      return NextResponse.json({ error: "Ingresa un correo y un rol válidos." }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const existing = await prisma.medicalPortalUser.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe una cuenta médica con ese correo." }, { status: 409 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "El servicio de correo no está configurado." },
        { status: 503 },
      );
    }

    const rawToken = createMedicalInvitationToken();
    const invitation = await prisma.$transaction(async (tx) => {
      await tx.medicalPortalInvitation.updateMany({
        where: { email, acceptedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return tx.medicalPortalInvitation.create({
        data: {
          email,
          role: parsed.data.role as MedicalPortalRoleDb,
          tokenHash: medicalInvitationTokenHash(rawToken),
          expiresAt: getMedicalInvitationExpiry(),
          invitedByUserId: session.userId,
        },
      });
    });

    const invitationUrl = `${appBaseUrl(request)}/medicos-login/crear-cuenta?token=${encodeURIComponent(rawToken)}`;
    const roleLabel = medicalRoleLabel(invitation.role);
    let emailError: unknown = null;
    try {
      const sendResult = await new Resend(process.env.RESEND_API_KEY).emails.send(
        {
          from: "Veramed <ordenes@mail.veramed.cl>",
          to: [invitation.email],
          subject: "Invitación al portal médico de Veramed",
          html: `
          <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.65;max-width:600px;margin:0 auto">
            <p style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#047857">Portal médico Veramed</p>
            <h1 style="font-size:26px;line-height:1.25">Te invitaron a crear tu cuenta médica</h1>
            <p>${escapeHtml(session.name)} te otorgó el rol <strong>${escapeHtml(roleLabel)}</strong>.</p>
            <p><a href="${invitationUrl}" style="display:inline-block;border-radius:12px;background:#064e3b;color:#fff;padding:12px 18px;text-decoration:none;font-weight:700">Crear mi cuenta</a></p>
            <p>El enlace es personal, funciona una sola vez y caduca en 7 días.</p>
            <p style="font-size:13px;color:#64748b">Si no esperabas esta invitación, puedes ignorar este correo.</p>
          </div>
        `,
        },
        { idempotencyKey: `medical-invitation-${invitation.id}` },
      );
      emailError = sendResult.error;
    } catch (error) {
      emailError = error;
    }

    if (emailError) {
      await prisma.medicalPortalInvitation.update({
        where: { id: invitation.id },
        data: { revokedAt: new Date() },
      });
      console.error("Resend medical invitation error", emailError);
      return NextResponse.json({ error: "No pudimos enviar la invitación." }, { status: 502 });
    }

    await recordMedicalAudit({
      session,
      action: "medical.invitation_sent",
      request,
      metadata: { invitationId: invitation.id, email, role: invitation.role },
    });

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return httpErrorResponse(error, "No pudimos enviar la invitación médica.");
  }
}
