import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  MEDICAL_PORTAL_SESSION_COOKIE,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";
import {
  countValidatedSymptomsByDoctor,
  listPendingSymptomsForPortal,
  listValidatedSymptomsByDoctor,
} from "@/lib/server/symptoms-store";

function parseMonthYear(searchParams: URLSearchParams) {
  const now = new Date();
  const monthRaw = Number(searchParams.get("month"));
  const yearRaw = Number(searchParams.get("year"));
  const month = Number.isInteger(monthRaw) && monthRaw >= 1 && monthRaw <= 12 ? monthRaw : now.getMonth() + 1;
  const year = Number.isInteger(yearRaw) && yearRaw >= 2024 && yearRaw <= 2100 ? yearRaw : now.getFullYear();
  return { month, year };
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value;
  const session = verifyMedicalPortalSessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const { month, year } = parseMonthYear(searchParams);

  const [pending, validated, validatedCount] = await Promise.all([
    listPendingSymptomsForPortal(),
    listValidatedSymptomsByDoctor({
      doctorEmail: session.email,
      month,
      year,
    }),
    countValidatedSymptomsByDoctor({
      doctorEmail: session.email,
      month,
      year,
    }),
  ]);

  return NextResponse.json({
    month,
    year,
    doctorEmail: session.email,
    validatedCount,
    pending: pending.map((row) => ({
      id: row.id,
      patientName: row.patient.fullName,
      primarySymptom: row.primarySymptom,
      oneLinerSummary: row.oneLinerSummary,
      reviewStatus: row.reviewStatus,
      createdAt: row.createdAt,
    })),
    validated: validated.map((row) => ({
      id: row.id,
      patientName: row.patient.fullName,
      primarySymptom: row.primarySymptom,
      oneLinerSummary: row.oneLinerSummary,
      reviewStatus: row.reviewStatus,
      validatedAt: row.validatedAt,
      createdAt: row.createdAt,
    })),
  });
}

