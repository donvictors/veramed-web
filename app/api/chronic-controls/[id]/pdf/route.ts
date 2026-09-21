import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";
import { getChronicControlRecord } from "@/lib/server/chronic-control-store";
import { buildOrderPdf } from "@/lib/server/order-pdf";
import { expandExamItemsForOrder } from "@/lib/exam-master-catalog";
import { requireApprovedMedicalSigner } from "@/lib/server/medical-approval";
import { hasValidInternalAccess } from "@/lib/server/internal-access";
import {
  getRequestAccessCookieName,
  hasValidRequestAccessCookie,
} from "@/lib/server/request-access";

export const runtime = "nodejs";

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
  const cookieStore = await cookies();
  const requestAccessCookie = cookieStore.get(getRequestAccessCookieName())?.value;

  if (record.userId && !internalAccess) {
    const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    const user = await getUserFromSession(token);

    if (!user || user.id !== record.userId) {
      return NextResponse.json({ error: "No tienes acceso a esta solicitud." }, { status: 403 });
    }
  } else if (!record.userId && !internalAccess) {
    const hasGuestAccess = hasValidRequestAccessCookie(requestAccessCookie, {
      requestType: "chronic_control",
      requestId: id,
      createdAtMs: record.createdAt,
    });
    if (!hasGuestAccess) {
      return NextResponse.json({ error: "No tienes acceso a esta solicitud." }, { status: 403 });
    }
  }

  const signer = await requireApprovedMedicalSigner("chronic_control", id).catch(() => null);
  if (!signer) {
    return NextResponse.json(
      { error: "La orden requiere pago confirmado y aprobación médica antes de descargarse." },
      { status: 403 },
    );
  }

  const issuedAtMs = record.status.approvedAt ?? record.status.queuedAt ?? record.updatedAt;
  const patient = record.patient ?? {
    fullName: "Paciente Veramed",
    rut: "",
    birthDate: "",
    email: "",
    phone: "",
    address: "",
  };
  const tests = expandExamItemsForOrder(record.rec.tests).map((test) => ({
    name: test.name,
    why: test.why,
  }));
  const buffer = await buildOrderPdf({
    title: "ORDEN DE CONTROL CRÓNICO",
    patient,
    tests,
    issuedAtMs,
    signer,
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="orden-control-cronico-${id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
