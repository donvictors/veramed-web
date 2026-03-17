import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { type TestItem } from "@/lib/checkup";
import { getExamMetadataByName } from "@/lib/exam-master-catalog";
import {
  MEDICAL_PORTAL_SESSION_COOKIE,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";
import { ensureSymptomsSignedPdfAssets } from "@/lib/server/symptoms-order-pdf-assets";
import { sendSymptomsValidatedOrderEmail } from "@/lib/server/symptoms-order-email";
import { getSymptomsRequest, validateSymptomsOrder } from "@/lib/server/symptoms-store";

type Params = {
  params: Promise<{ id: string }>;
};

const bodySchema = z.object({
  selectedExamNames: z.array(z.string().min(1)).default([]),
});

function uniqueByName(tests: TestItem[]) {
  const map = new Map<string, TestItem>();
  for (const test of tests) {
    if (!map.has(test.name)) {
      map.set(test.name, test);
    }
  }
  return Array.from(map.values());
}

function buildManualTestFromCatalog(name: string): TestItem | null {
  const metadata = getExamMetadataByName(name);
  if (!metadata) {
    return null;
  }
  return {
    name: metadata.name,
    why: "Añadido por médico validador durante la revisión clínica.",
  };
}

export async function POST(request: Request, context: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value;
    const session = verifyMedicalPortalSessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { id } = await context.params;
    const requestId = id?.trim();
    if (!requestId) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Body inválido." }, { status: 400 });
    }

    const parsedBody = bodySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const record = await getSymptomsRequest(requestId);
    if (!record) {
      return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
    }

    if (!record.payment || record.payment.status !== "paid") {
      return NextResponse.json(
        { error: "La solicitud no tiene pago confirmado." },
        { status: 409 },
      );
    }

    const pool = record.suggestedTests.length > 0 ? record.suggestedTests : record.selectedTests;
    const requestedNames = new Set(parsedBody.data.selectedExamNames.map((name) => name.trim()));
    const poolByName = new Map(pool.map((test) => [test.name, test] as const));
    const selected = uniqueByName(
      Array.from(requestedNames)
        .map((name) => poolByName.get(name) ?? buildManualTestFromCatalog(name))
        .filter((item): item is TestItem => Boolean(item)),
    );

    if (selected.length === 0) {
      return NextResponse.json(
        { error: "Debes mantener al menos un examen para validar la orden." },
        { status: 400 },
      );
    }

    const validated = await validateSymptomsOrder({
      requestId,
      doctorEmail: session.email,
      selectedTests: selected,
    });

    const warnings: string[] = [];
    let assets: Awaited<ReturnType<typeof ensureSymptomsSignedPdfAssets>> = [];

    try {
      assets = await ensureSymptomsSignedPdfAssets({
        requestId: validated.id,
        patient: {
          fullName: validated.patient.fullName,
          rut: validated.patient.rut,
          birthDate: validated.patient.birthDate,
          email: validated.patient.email,
          phone: validated.patient.phone,
          address: validated.patient.address,
        },
        tests: selected,
        issuedAtMs: validated.validatedAt ?? Date.now(),
      });
    } catch (error) {
      console.error("Error generando PDFs firmados en validación de síntomas", {
        requestId: validated.id,
        error,
      });
      warnings.push(
        "La orden quedó validada, pero no pudimos generar los PDFs firmados automáticamente.",
      );
    }

    try {
      await sendSymptomsValidatedOrderEmail(validated.id, {
        assets: assets.map((asset) => ({
          category: asset.category,
          fileName: asset.fileName,
          blobUrl: asset.blobUrl,
        })),
      });
    } catch (error) {
      console.error("Error enviando correo tras validación de síntomas", {
        requestId: validated.id,
        error,
      });
      warnings.push("La orden quedó validada, pero no pudimos enviar el correo automáticamente.");
    }

    return NextResponse.json({
      ok: true,
      requestId: validated.id,
      reviewStatus: validated.reviewStatus,
      validatedByEmail: validated.validatedByEmail,
      validatedAt: validated.validatedAt,
      warnings,
      signedPdfLinks: assets.map((asset) => ({
        category: asset.category,
        fileName: asset.fileName,
        url: asset.blobUrl,
      })),
    });
  } catch (error) {
    console.error("Error validando orden de síntomas en portal médico", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "No pudimos validar la orden en este momento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
