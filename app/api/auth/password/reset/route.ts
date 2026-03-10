import { NextResponse } from "next/server";
import {
  findUserForPasswordResetById,
  resetPasswordByUserId,
} from "@/lib/server/auth-store";
import { verifyPasswordResetToken } from "@/lib/server/password-reset";

export async function POST(request: Request) {
  let payload: { token?: string; password?: string };

  try {
    payload = (await request.json()) as { token?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const token = payload.token?.trim() ?? "";
  const password = payload.password ?? "";

  if (!token) {
    return NextResponse.json({ error: "Token inválido." }, { status: 400 });
  }

  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres." },
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
}
