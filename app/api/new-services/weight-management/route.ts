import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";
import { WEIGHT_MANAGEMENT_PRICE_CLP, WEIGHT_MANAGEMENT_PROTOCOL_VERSION, calculateBmi, evaluateWeightManagement, weightComorbidities } from "@/lib/clinical/weight-management-protocol";
import { enforceRateLimit, httpErrorResponse, readJsonBody, requireSameOrigin } from "@/lib/server/http-security";

const safety = z.object({ pregnant: z.boolean(), breastfeeding: z.boolean(), planningPregnancy: z.boolean(), medullaryThyroidCancerOrMen2: z.boolean(), semaglutideHypersensitivity: z.boolean(), pancreatitis: z.boolean(), relevantBiliaryDisease: z.boolean(), severeGastroparesisSymptoms: z.boolean(), relevantKidneyDisease: z.boolean(), usingOtherGlp1OrTirzepatide: z.boolean(), usingInsulinOrSulfonylurea: z.boolean(), bariatricSurgery: z.boolean() });
const schema = z.object({ age: z.number().int().min(18).max(100), sex: z.enum(["female", "male", "other"]), heightCm: z.number().min(120).max(230), weightKg: z.number().min(35).max(350), bodyFatPct: z.number().min(1).max(80).nullable(), comorbidities: z.array(z.enum(weightComorbidities)), safety });

export async function POST(request: Request) {
  try {
  requireSameOrigin(request);
  await enforceRateLimit({ request, action: "weight-management:evaluate", limit: 10, windowMs: 15 * 60 * 1000 });
  const parsed = schema.safeParse(await readJsonBody(request, 15_000));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los datos de la evaluación." }, { status: 400 });
  const bmi = calculateBmi(parsed.data.weightKg, parsed.data.heightCm);
  const outcome = evaluateWeightManagement({ age: parsed.data.age, bmi, comorbidities: parsed.data.comorbidities, safety: parsed.data.safety });
  const user = await getUserFromSession((await cookies()).get(AUTH_SESSION_COOKIE)?.value);
  const priceClp = outcome === "standard_path" ? WEIGHT_MANAGEMENT_PRICE_CLP : null;
  const saved = await prisma.newServiceRequest.create({ data: { type: "weight_management", status: "eligibility_complete", userId: user?.id, patientData: { age: parsed.data.age, sex: parsed.data.sex }, questionnaire: { ...parsed.data, bmi }, eligibilityResult: outcome, protocolVersion: WEIGHT_MANAGEMENT_PROTOCOL_VERSION, priceClp } });
  return NextResponse.json({ id: saved.id, outcome, bmi, priceClp });
  } catch (error) {
    const security = httpErrorResponse(error, "");
    if (security.status !== 500) return security;
    return NextResponse.json({ error: "No pudimos evaluar tus respuestas." }, { status: 500 });
  }
}
