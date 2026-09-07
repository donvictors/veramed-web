import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken, getPasswordResetTtlMs } from "@/lib/server/password-reset";
import {
  enforceRateLimit,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";

const GENERIC_RESPONSE = {
  ok: true,
  message: "Si existe una cuenta médica con ese correo, enviaremos un enlace de recuperación.",
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getAppBaseUrl(request: Request) {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, "");
  const current = new URL(request.url);
  return `${current.protocol}//${current.host}`;
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await enforceRateLimit({
      request,
      action: "medical-auth:forgot",
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    const payload = (await readJsonBody(request, 4_000)) as { email?: string };
    const email = payload.email?.trim().toLowerCase() ?? "";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Ingresa un correo válido." }, { status: 400 });
    }

    const user = await prisma.medicalPortalUser.findUnique({ where: { email } });
    if (!user?.active || !process.env.RESEND_API_KEY) {
      if (user?.active && !process.env.RESEND_API_KEY) {
        console.error("No se pudo enviar recuperación médica: falta RESEND_API_KEY.");
      }
      return NextResponse.json(GENERIC_RESPONSE, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    try {
      const token = createPasswordResetToken({
        userId: user.id,
        passwordHash: user.passwordHash,
        purpose: "medical",
      });
      const resetUrl = `${getAppBaseUrl(request)}/medicos-login/recuperar-contrasena/nueva?token=${encodeURIComponent(token)}`;
      const ttlMinutes = Math.floor(getPasswordResetTtlMs() / 60_000);
      const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: "Veramed <ordenes@mail.veramed.cl>",
        to: [user.email],
        subject: "Recupera tu acceso al portal médico de Veramed",
        html: `
          <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
            <p>Hola,</p>
            <p>Recibimos una solicitud para recuperar tu acceso al portal médico de Veramed.</p>
            <p><a href="${resetUrl}">Crear una nueva contraseña</a></p>
            <p>Este enlace expirará en ${ttlMinutes} minutos y dejará de funcionar después de cambiar la contraseña.</p>
            <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
          </div>
        `,
      });
      if (result.error) console.error("Resend medical forgot password error", result.error);
    } catch (error) {
      console.error("No pudimos enviar el correo de recuperación médica", error);
    }

    return NextResponse.json(GENERIC_RESPONSE, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos procesar la recuperación.");
  }
}
