import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";
import { PRESCRIPTION_RENEWAL_PRICE_CLP, PRESCRIPTION_RENEWAL_PROTOCOL_VERSION, evaluatePrescriptionRenewal } from "@/lib/clinical/prescription-renewal-protocol";
import { enforceRateLimit, httpErrorResponse, readJsonBody, requireSameOrigin } from "@/lib/server/http-security";

const schema = z.object({ medicationId: z.string().min(1), dose: z.string().min(1).max(100), frequency: z.string().min(1).max(100), since: z.string().min(1).max(100), indication: z.string().min(2).max(300), sameDose: z.boolean(), importantAdverseEffects: z.boolean(), importantHealthChanges: z.boolean(), newMedications: z.string().max(500).default("") });

export async function POST(request: Request) {
  try {
  requireSameOrigin(request);
  await enforceRateLimit({ request, action: "prescription-renewal:evaluate", limit: 10, windowMs: 15 * 60 * 1000 });
  const parsed = schema.safeParse(await readJsonBody(request, 12_000));
  if (!parsed.success) return NextResponse.json({ error: "Completa los antecedentes solicitados." }, { status: 400 });
  const outcome = evaluatePrescriptionRenewal(parsed.data);
  const user = await getUserFromSession((await cookies()).get(AUTH_SESSION_COOKIE)?.value);
  const priceClp = outcome === "eligible_for_renewal" ? PRESCRIPTION_RENEWAL_PRICE_CLP : null;
  const saved = await prisma.newServiceRequest.create({ data: { type: "prescription_renewal", status: "eligibility_complete", userId: user?.id, patientData: {}, questionnaire: parsed.data, eligibilityResult: outcome, protocolVersion: PRESCRIPTION_RENEWAL_PROTOCOL_VERSION, priceClp } });
  return NextResponse.json({ id: saved.id, outcome, priceClp });
  } catch (error) {
    const security = httpErrorResponse(error, "");
    if (security.status !== 500) return security;
    return NextResponse.json({ error: "No pudimos evaluar la renovación." }, { status: 500 });
  }
}
