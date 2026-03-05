import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";
import { getCheckupRecord } from "@/lib/server/checkup-store";
import { buildOrderPdf } from "@/lib/server/order-pdf";

export const runtime = "nodejs";

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

  const issuedAtMs = record.status.approvedAt ?? record.status.queuedAt ?? record.updatedAt;
  const patient = record.patient ?? {
    fullName: "Paciente Veramed",
    rut: "",
    birthDate: "",
    email: "",
    phone: "",
    address: "",
  };
  const tests = record.rec.tests.map((test) => ({
    name: test.name,
    why: test.why,
  }));
  const buffer = await buildOrderPdf({
    title: "ORDEN DE EXÁMENES",
    patient,
    tests,
    issuedAtMs,
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="orden-chequeo-${id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
