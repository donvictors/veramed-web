import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  enforceRateLimit,
  getRequestIpHash,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";
import { hashPassword } from "@/lib/server/password-hashing";
import { verifyPasswordResetToken } from "@/lib/server/password-reset";

const schema = z.object({
  token: z.string().min(1).max(2_000),
  password: z.string().min(12).max(200),
});

function readUserId(token: string) {
  try {
    const [payloadPart] = token.split(".");
    const payload = JSON.parse(Buffer.from(payloadPart || "", "base64url").toString("utf8")) as {
      uid?: string;
      purpose?: string;
    };
    return payload.purpose === "medical" ? payload.uid?.trim() ?? "" : "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await enforceRateLimit({
      request,
      action: "medical-auth:reset",
      limit: 8,
      windowMs: 60 * 60 * 1000,
    });
    const parsed = schema.safeParse(await readJsonBody(request, 8_000));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "El enlace no es válido o la contraseña tiene menos de 12 caracteres." },
        { status: 400 },
      );
    }

    const userId = readUserId(parsed.data.token);
    if (!userId) {
      return NextResponse.json({ error: "Token inválido o expirado." }, { status: 400 });
    }

    const user = await prisma.medicalPortalUser.findUnique({ where: { id: userId } });
    if (!user?.active) {
      return NextResponse.json({ error: "Token inválido o expirado." }, { status: 400 });
    }

    const verification = verifyPasswordResetToken(
      parsed.data.token,
      user.passwordHash,
      "medical",
    );
    if (!verification.ok || verification.userId !== user.id) {
      return NextResponse.json({ error: "Token inválido o expirado." }, { status: 400 });
    }

    const { hash, salt } = hashPassword(parsed.data.password);
    const now = new Date();
    await prisma.$transaction([
      prisma.medicalPortalUser.update({
        where: { id: user.id },
        data: { passwordHash: hash, passwordSalt: salt },
      }),
      prisma.medicalPortalSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      }),
      prisma.medicalAuditLog.create({
        data: {
          userId: user.id,
          actorEmail: user.email,
          action: "medical.password_recovered",
          ipHash: getRequestIpHash(request),
        },
      }),
    ]);

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return httpErrorResponse(error, "No pudimos restablecer la contraseña médica.");
  }
}
