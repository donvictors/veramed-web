import { NextResponse } from "next/server";
import {
  findUserForPasswordResetById,
  resetPasswordByUserId,
} from "@/lib/server/auth-store";
import { verifyPasswordResetToken } from "@/lib/server/password-reset";
import {
  enforceRateLimit,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await enforceRateLimit({ request, action: "auth:reset", limit: 8, windowMs: 60 * 60 * 1000 });
    const payload = (await readJsonBody(request, 8_000)) as { token?: string; password?: string };

  const token = payload.token?.trim() ?? "";
  const password = payload.password ?? "";

  if (!token) {
    return NextResponse.json({ error: "Token inválido." }, { status: 400 });
  }

  if (!password || password.length < 10) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 10 caracteres." },
      { status: 400 },
    );
  }

  let userId = "";
  try {
    const [payloadPart] = token.split(".");
    const decoded = JSON.parse(
      Buffer.from(payloadPart || "", "base64url").toString("utf8"),
    ) as { uid?: string };
    userId = decoded.uid?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Token inválido o expirado." }, { status: 400 });
  }

  if (!userId) {
    return NextResponse.json({ error: "Token inválido o expirado." }, { status: 400 });
  }

  const user = await findUserForPasswordResetById(userId);
  if (!user) {
    return NextResponse.json({ error: "Token inválido o expirado." }, { status: 400 });
  }

  const verification = verifyPasswordResetToken(token, user.passwordHash);
  if (!verification.ok || verification.userId !== user.id) {
    return NextResponse.json({ error: "Token inválido o expirado." }, { status: 400 });
  }

    await resetPasswordByUserId(user.id, password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos restablecer la contraseña.");
  }
}
