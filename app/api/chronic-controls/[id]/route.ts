import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";
import {
  getChronicControlRecord,
  serializeChronicControlRecord,
  updateChronicControlScreeningPreferences,
} from "@/lib/server/chronic-control-store";
import { hasValidInternalAccess } from "@/lib/server/internal-access";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const record = await getChronicControlRecord(id);

  if (!record) {
    return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }

  const internalAccess = hasValidInternalAccess(_request, {
    requestType: "chronic_control",
    requestId: id,
  });

  if (record.userId && !internalAccess) {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    const user = await getUserFromSession(token);

    if (!user || user.id !== record.userId) {
      return NextResponse.json({ error: "No tienes acceso a esta solicitud." }, { status: 403 });
    }
  }

  return NextResponse.json({ request: serializeChronicControlRecord(record) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const current = await getChronicControlRecord(id);

  if (!current) {
    return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }

  const internalAccess = hasValidInternalAccess(request, {
    requestType: "chronic_control",
    requestId: id,
  });

  if (current.userId && !internalAccess) {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    const user = await getUserFromSession(token);

    if (!user || user.id !== current.userId) {
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
      return NextResponse.json({ error: "No enviaste cambios para aplicar." }, { status: 400 });
    }

    if (
      payload.colorectalMethod !== undefined &&
      payload.colorectalMethod !== "fit" &&
      payload.colorectalMethod !== "colonoscopy"
    ) {
      return NextResponse.json({ error: "Método colorrectal inválido." }, { status: 400 });
    }

    if (
      payload.cervicalMethod !== undefined &&
      payload.cervicalMethod !== "pap" &&
      payload.cervicalMethod !== "hpv" &&
      payload.cervicalMethod !== "cotesting"
    ) {
      return NextResponse.json({ error: "Método cervicouterino inválido." }, { status: 400 });
    }

    if (
      payload.bloodPressureMethod !== undefined &&
      payload.bloodPressureMethod !== "mapa" &&
      payload.bloodPressureMethod !== "skip"
    ) {
      return NextResponse.json({ error: "Método de presión arterial inválido." }, { status: 400 });
    }

    if (
      payload.breastImaging !== undefined &&
      payload.breastImaging !== "mammo_only" &&
      payload.breastImaging !== "mammo_plus_ultrasound"
    ) {
      return NextResponse.json({ error: "Método de mama inválido." }, { status: 400 });
    }

    if (
      payload.prostateMethod !== undefined &&
      payload.prostateMethod !== "include" &&
      payload.prostateMethod !== "skip"
    ) {
      return NextResponse.json({ error: "Método de APE inválido." }, { status: 400 });
    }

    if (payload.addTestName !== undefined && !payload.addTestName.trim()) {
      return NextResponse.json({ error: "Nombre de examen adicional inválido." }, { status: 400 });
    }

    if (payload.removeTestName !== undefined && !payload.removeTestName.trim()) {
      return NextResponse.json({ error: "Nombre de examen a remover inválido." }, { status: 400 });
    }

    if (payload.restoreTestName !== undefined && !payload.restoreTestName.trim()) {
      return NextResponse.json({ error: "Nombre de examen a restaurar inválido." }, { status: 400 });
    }

    const updated = await updateChronicControlScreeningPreferences(id, payload);
    if (!updated) {
      return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ request: serializeChronicControlRecord(updated) });
  } catch (error) {
    console.error("PATCH /api/chronic-controls/[id] failed", error);
    return NextResponse.json(
      { error: "No pudimos actualizar tu configuración clínica." },
      { status: 500 },
    );
  }
}
