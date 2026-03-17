import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { calculateAgeFromBirthDate } from "@/lib/checkup";
import {
  calculateDiscountedAmount,
  getDiscountByCode,
  normalizeDiscountCode,
} from "@/lib/discount-codes";
import type { SymptomsInterpretation } from "@/lib/symptoms-intake";
import {
  EMPTY_SYMPTOMS_ANTECEDENTS,
  type SymptomsAntecedents,
} from "@/lib/symptoms-order";
import { getUserFromSession } from "@/lib/server/auth-store";
import { parseCreateResponse } from "@/lib/server/transbank/normalize";
import { buildTransbankTransaction, getAppUrl } from "@/lib/server/transbank/config";
import { buildSymptomsCachedInput, createOrUpdateSymptomsDraft, markSymptomsPaymentPending } from "@/lib/server/symptoms-store";
import { upsertSymptomsPaymentTransaction } from "@/lib/server/symptoms-payment";

export const runtime = "nodejs";

const SYMPTOMS_PRICE_CLP = 5990;
const BUY_ORDER_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_BUY_ORDER_LENGTH = 26;
const MAX_SESSION_ID_LENGTH = 61;

const payloadSchema = z.object({
  orderId: z.string().min(1).max(MAX_BUY_ORDER_LENGTH),
  sessionId: z.string().min(1).max(MAX_SESSION_ID_LENGTH),
  discountCode: z.string().optional(),
  draft: z.object({
    input: z.string().min(12),
    engineVersion: z.string().min(1),
    patientSex: z.enum(["female", "male", ""]).optional().default(""),
    patient: z.object({
      fullName: z.string().min(1),
      rut: z.string().min(1),
      birthDate: z.string().min(1),
      email: z.string().optional().default(""),
      phone: z.string().optional().default(""),
      address: z.string().optional().default(""),
    }),
    antecedents: z
      .object({
        medicalHistory: z.string().optional(),
        surgicalHistory: z.string().optional(),
        chronicMedication: z.string().optional(),
        allergies: z.string().optional(),
        smoking: z.string().optional(),
        alcoholUse: z.string().optional(),
        drugUse: z.string().optional(),
        sexualActivity: z.string().optional(),
        firstDegreeFamilyHistory: z.string().optional(),
        occupation: z.string().optional(),
      })
      .default({}),
    output: z.object({
      flowId: z.string().optional(),
      oneLinerSummary: z.string().min(1),
      primarySymptom: z.string().min(1),
      secondarySymptoms: z.array(z.string()).default([]),
      followUpQuestions: z.array(z.string()).default([]),
      probableContext: z.string().min(1),
      consultationFrame: z.string().min(1),
      tags: z.array(z.string()).default([]),
      urgencyWarning: z.boolean(),
      guidanceText: z.string().min(1),
    }),
  }),
});

function normalizeAntecedents(raw: Partial<SymptomsAntecedents>): SymptomsAntecedents {
  return {
    ...EMPTY_SYMPTOMS_ANTECEDENTS,
    ...raw,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido para pago de síntomas." }, { status: 400 });
  }

  const data = parsed.data;
  if (!BUY_ORDER_PATTERN.test(data.orderId)) {
    return NextResponse.json(
      { error: "orderId solo permite letras, números, guion y guion bajo." },
      { status: 400 },
    );
  }

  const discountCode = normalizeDiscountCode(data.discountCode);
  if (discountCode && !getDiscountByCode(discountCode)) {
    return NextResponse.json({ error: "Código de descuento inválido." }, { status: 400 });
  }

  try {
    const pricing = calculateDiscountedAmount(SYMPTOMS_PRICE_CLP, discountCode);
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    const user = await getUserFromSession(token);

    const age = calculateAgeFromBirthDate(data.draft.patient.birthDate);
    const antecedents = normalizeAntecedents(data.draft.antecedents);
    const cachedInput = buildSymptomsCachedInput({
      sex:
        data.draft.patientSex === "female"
          ? "Femenino"
          : data.draft.patientSex === "male"
            ? "Masculino"
            : "",
      age,
      symptomsText: data.draft.input,
      antecedents,
    });

    await createOrUpdateSymptomsDraft({
      id: data.orderId,
      userId: user?.id,
      symptomsText: data.draft.input.trim(),
      patient: {
        fullName: data.draft.patient.fullName.trim(),
        rut: data.draft.patient.rut.trim(),
        birthDate: data.draft.patient.birthDate.trim(),
        sex: data.draft.patientSex,
        email: data.draft.patient.email.trim(),
        phone: data.draft.patient.phone.trim(),
        address: data.draft.patient.address.trim(),
      },
      interpretation: data.draft.output as SymptomsInterpretation,
      antecedents,
      engineVersion: data.draft.engineVersion.trim(),
      cachedInput,
    });

    const returnUrl = `${getAppUrl()}/api/sintomas/payments/return`;
    const transaction = buildTransbankTransaction();
    const raw = await transaction.create(
      data.orderId,
      data.sessionId,
      pricing.finalAmount,
      returnUrl,
    );
    const created = parseCreateResponse(raw);
    if (!created) {
      throw new Error("Respuesta inválida al crear transacción en Transbank.");
    }

    await upsertSymptomsPaymentTransaction({
      requestId: data.orderId,
      orderId: data.orderId,
      sessionId: data.sessionId,
      amount: pricing.finalAmount,
      token: created.token,
      webpayUrl: created.url,
    });

    await markSymptomsPaymentPending({
      requestId: data.orderId,
      amount: pricing.finalAmount,
      currency: "CLP",
      paymentId: created.token,
    });

    return NextResponse.json({
      requestId: data.orderId,
      token: created.token,
      url: created.url,
      amount: pricing.finalAmount,
      redirectUrl: `${created.url}?token_ws=${encodeURIComponent(created.token)}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No pudimos crear la transacción en Transbank.";
    console.error("POST /api/sintomas/payments/create", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
