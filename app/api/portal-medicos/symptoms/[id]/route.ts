import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  MEDICAL_PORTAL_SESSION_COOKIE,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";
import { getSymptomsRequest } from "@/lib/server/symptoms-store";
import { listSymptomsSignedPdfAssets } from "@/lib/server/symptoms-order-pdf-assets";
import { getExamCatalog } from "@/lib/exam-master-catalog";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Params) {
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

  const record = await getSymptomsRequest(requestId);
  if (!record) {
    return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }

  let signedAssets: Awaited<ReturnType<typeof listSymptomsSignedPdfAssets>> = [];
  try {
    signedAssets = await listSymptomsSignedPdfAssets(requestId);
  } catch (error) {
    console.error("No pudimos cargar assets firmados en portal médico", {
      requestId,
      error,
    });
  }
  const examCatalog = getExamCatalog()
    .map((exam) => ({
      name: exam.name,
      category: exam.category,
      fonasaCode: exam.fonasaCode,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  return NextResponse.json({
    request: {
      id: record.id,
      reviewStatus: record.reviewStatus,
      symptomsText: record.symptomsText,
      oneLinerSummary: record.oneLinerSummary,
      primarySymptom: record.primarySymptom,
      secondarySymptoms: record.secondarySymptoms,
      patient: record.patient,
      antecedents: record.antecedents,
      suggestedTests: record.suggestedTests,
      selectedTests: record.selectedTests.length > 0 ? record.selectedTests : record.suggestedTests,
      followUpQuestions: record.followUpQuestions,
      followUpAnswers: record.followUpAnswers,
      validatedByEmail: record.validatedByEmail,
      validatedAt: record.validatedAt,
      signedPdfLinks: signedAssets.map((asset) => ({
        category: asset.category,
        url: asset.blobUrl,
        fileName: asset.fileName,
      })),
    },
    examCatalog,
  });
}
