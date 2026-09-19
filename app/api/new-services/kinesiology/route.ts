import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";
import { KINESIOLOGY_PRICE_CLP, KINESIOLOGY_PROTOCOL_VERSION, evaluateKinesiologyEligibility } from "@/lib/clinical/kinesiology-eligibility";
import { extractKinesiologyDocument, validateAndStoreClinicalDocument } from "@/lib/server/kinesiology-document";
import { enforceRateLimit, httpErrorResponse, requireSameOrigin } from "@/lib/server/http-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await enforceRateLimit({ request, action: "kinesiology:evaluate", limit: 6, windowMs: 15 * 60 * 1000 });
    const form = await request.formData();
    if (form.get("hasDiagnosis") !== "yes") return NextResponse.json({ outcome: "not_eligible", redirect: "/sintomas", priceClp: null });
    const file = form.get("document");
    if (!(file instanceof File)) return NextResponse.json({ error: "Sube el documento donde aparece tu diagnóstico." }, { status: 400 });
    const user = await getUserFromSession((await cookies()).get(AUTH_SESSION_COOKIE)?.value);
    const id = `ks_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
    const stored = await validateAndStoreClinicalDocument(file, id);
    const extraction = await extractKinesiologyDocument(stored.bytes, stored.mime);
    const outcome = evaluateKinesiologyEligibility(extraction);
    const priceClp = outcome === "eligible" ? KINESIOLOGY_PRICE_CLP : null;
    await prisma.newServiceRequest.create({ data: { id, type: "kinesiology", status: "eligibility_complete", userId: user?.id, patientData: {}, questionnaire: { hasDiagnosis: true }, extractedClinicalData: extraction, eligibilityResult: outcome, protocolVersion: KINESIOLOGY_PROTOCOL_VERSION, priceClp, uploadedDocumentPath: stored.path, uploadedDocumentName: stored.name, uploadedDocumentMime: stored.mime } });
    return NextResponse.json({ id, outcome, priceClp });
  } catch (error) {
    const security = httpErrorResponse(error, "");
    if (security.status !== 500) return security;
    const message = error instanceof Error ? error.message : "No pudimos revisar el documento.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
