import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";
import {
  getCheckupRecord,
  serializeCheckupRecord,
  updateCheckupScreeningPreferences,
} from "@/lib/server/checkup-store";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const record = await getCheckupRecord(id);

  if (!record) {
    return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }

  if (record.userId) {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    const user = await getUserFromSession(token);

    if (!user || user.id !== record.userId) {
      return NextResponse.json({ error: "No tienes acceso a esta solicitud." }, { status: 403 });
    }
  }

  return NextResponse.json({ checkup: serializeCheckupRecord(record) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const record = await getCheckupRecord(id);

  if (!record) {
    return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }

  if (record.userId) {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    const user = await getUserFromSession(token);

    if (!user || user.id !== record.userId) {
      return NextResponse.json({ error: "No tienes acceso a esta solicitud." }, { status: 403 });
    }
  }

  try {
    const payload = (await request.json()) as {
      colorectalMethod?: "fit" | "colonoscopy";
      cervicalMethod?: "pap" | "hpv" | "cotesting";
      bloodPressureMethod?: "mapa" | "skip";
      breastImaging?: "mammo_only" | "mammo_plus_ultrasound";
      prostateMethod?: "include" | "skip";
      addTestName?: string;
      removeTestName?: string;
      restoreTestName?: string;
    };

    if (
      payload.colorectalMethod === undefined &&
      payload.cervicalMethod === undefined &&
      payload.bloodPressureMethod === undefined &&
      payload.breastImaging === undefined &&
      payload.prostateMethod === undefined &&
      payload.addTestName === undefined &&
      payload.removeTestName === undefined &&
      payload.restoreTestName === undefined
    ) {
      return NextResponse.json({ error: "No se recibió ninguna preferencia." }, { status: 400 });
    }

    if (
      payload.colorectalMethod !== undefined &&
      payload.colorectalMethod !== "fit" &&
      payload.colorectalMethod !== "colonoscopy"
    ) {
      return NextResponse.json({ error: "Método de tamizaje inválido." }, { status: 400 });
    }

    if (
      payload.cervicalMethod !== undefined &&
      payload.cervicalMethod !== "pap" &&
      payload.cervicalMethod !== "hpv" &&
      payload.cervicalMethod !== "cotesting"
    ) {
      return NextResponse.json(
        { error: "Método de tamizaje cervicouterino inválido." },
        { status: 400 },
      );
    }

    if (
      payload.bloodPressureMethod !== undefined &&
      payload.bloodPressureMethod !== "mapa" &&
      payload.bloodPressureMethod !== "skip"
    ) {
      return NextResponse.json(
        { error: "Preferencia de presión arterial inválida." },
        { status: 400 },
      );
    }

    if (
      payload.breastImaging !== undefined &&
      payload.breastImaging !== "mammo_only" &&
      payload.breastImaging !== "mammo_plus_ultrasound"
    ) {
      return NextResponse.json(
        { error: "Preferencia de tamizaje mamario inválida." },
        { status: 400 },
      );
    }

    if (
      payload.prostateMethod !== undefined &&
      payload.prostateMethod !== "include" &&
      payload.prostateMethod !== "skip"
    ) {
      return NextResponse.json(
        { error: "Preferencia de tamizaje prostático inválida." },
        { status: 400 },
      );
    }

    if (payload.addTestName !== undefined && !payload.addTestName.trim()) {
      return NextResponse.json({ error: "Examen inválido." }, { status: 400 });
    }

    if (payload.removeTestName !== undefined && !payload.removeTestName.trim()) {
      return NextResponse.json({ error: "Examen inválido." }, { status: 400 });
    }

    if (payload.restoreTestName !== undefined && !payload.restoreTestName.trim()) {
      return NextResponse.json({ error: "Examen inválido." }, { status: 400 });
    }

    const updated = await updateCheckupScreeningPreferences(id, payload);

    if (!updated) {
      return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ checkup: serializeCheckupRecord(updated) });
  } catch (error) {
    console.error("PATCH /api/checkups/[id] failed", error);
    return NextResponse.json(
      { error: "No pudimos actualizar tu selección de tamizaje." },
      { status: 500 },
    );
  }
}
