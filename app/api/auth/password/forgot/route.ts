import { NextResponse } from "next/server";
import { Resend } from "resend";
import { findUserForPasswordReset } from "@/lib/server/auth-store";
import { createPasswordResetToken, getPasswordResetTtlMs } from "@/lib/server/password-reset";
import {
  enforceRateLimit,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getAppBaseUrl(request: Request) {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }
  const current = new URL(request.url);
  return `${current.protocol}//${current.host}`;
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await enforceRateLimit({ request, action: "auth:forgot", limit: 5, windowMs: 60 * 60 * 1000 });
    const payload = (await readJsonBody(request, 4_000)) as { email?: string };

  const email = payload.email?.trim().toLowerCase() ?? "";
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Ingresa un correo válido." }, { status: 400 });
  }

  const genericOk = {
    ok: true,
    message:
      "Si existe una cuenta con ese correo, te enviaremos un enlace para recuperar tu contraseña.",
  };

  const user = await findUserForPasswordReset(email);
  if (!user) {
    return NextResponse.json(genericOk);
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("No se pudo enviar recuperación de contraseña: falta RESEND_API_KEY.");
    return NextResponse.json(genericOk);
  }

  try {
    const token = createPasswordResetToken({
      userId: user.id,
      passwordHash: user.passwordHash,
    });

    const baseUrl = getAppBaseUrl(request);
    const resetUrl = `${baseUrl}/recuperar-contrasena/nueva?token=${encodeURIComponent(token)}`;
    const ttlMinutes = Math.floor(getPasswordResetTtlMs() / 60000);

    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: "Veramed <ordenes@mail.veramed.cl>",
      to: [user.email],
      subject: "Recupera tu contraseña en Veramed",
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
          <p>Hola ${user.name?.split(" ")[0] || "paciente"},</p>
          <p>Recibimos una solicitud para recuperar tu contraseña en Veramed.</p>
          <p>
            Haz clic aquí para crear una nueva contraseña:
            <a href="${resetUrl}">${resetUrl}</a>
          </p>
          <p>Este enlace expirará en ${ttlMinutes} minutos.</p>
          <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
        </div>
      `,
    });

    if (result.error) {
      console.error("Resend forgot password error", result.error);
    }
  } catch (error) {
    console.error("No pudimos enviar correo de recuperación", error);
  }

    return NextResponse.json(genericOk);
  } catch (error) {
    return httpErrorResponse(error, "No pudimos procesar la recuperación.");
  }
}
