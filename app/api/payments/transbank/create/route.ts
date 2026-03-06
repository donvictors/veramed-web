import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";
import {
  createTransbankPayment,
  validateCreatePayload,
} from "@/lib/server/transbank/service";

export const runtime = "nodejs";

function resolveErrorStatus(message: string) {
  if (message.includes("obligatorio") || message.includes("inválido") || message.includes("debe")) {
    return 400;
  }
  if (message.includes("No tienes acceso")) {
    return 403;
  }
  if (message.includes("no encontrada")) {
    return 404;
  }
  if (message.includes("ya existe")) {
    return 409;
  }
  if (message.includes("ya registra un pago")) {
    return 409;
  }
  return 500;
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const validation = validateCreatePayload(payload);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    const user = await getUserFromSession(token);

    const created = await createTransbankPayment(validation.value, user?.id);
    return NextResponse.json(created);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos crear la transacción en Transbank.";
    console.error("POST /api/payments/transbank/create", error);
    return NextResponse.json({ error: message }, { status: resolveErrorStatus(message) });
  }
}
