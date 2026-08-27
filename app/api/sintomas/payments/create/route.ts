import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { calculateAgeFromBirthDate } from "@/lib/checkup";
import { calculateDiscountedAmount } from "@/lib/discount-pricing";
import {
  getDiscountByCode,
  normalizeDiscountCode,
} from "@/lib/server/discount-codes";
import type { SymptomsInterpretation } from "@/lib/symptoms-intake";
import {
  EMPTY_SYMPTOMS_ANTECEDENTS,
  SYMPTOMS_PRICE_CLP,
  type SymptomsAntecedents,
} from "@/lib/symptoms-order";
import { getUserFromSession } from "@/lib/server/auth-store";
import { parseCreateResponse } from "@/lib/server/transbank/normalize";
import { buildTransbankTransaction, getAppUrl } from "@/lib/server/transbank/config";
import {
  buildSymptomsCachedInput,
  createOrUpdateSymptomsDraft,
  getSymptomsRequest,
  markSymptomsPaymentPending,
} from "@/lib/server/symptoms-store";
import { upsertSymptomsPaymentTransaction } from "@/lib/server/symptoms-payment";
import {
  getRequestAccessCookieName,
  hasValidRequestAccessCookie,
  upsertRequestAccessCookie,
} from "@/lib/server/request-access";
import {
  enforceRateLimit,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";
import { patientSchema, symptomsAntecedentsSchema } from "@/lib/server/request-schemas";

export const runtime = "nodejs";
const BUY_ORDER_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_BUY_ORDER_LENGTH = 26;
const MAX_SESSION_ID_LENGTH = 61;

const payloadSchema = z.object({
  orderId: z.string().min(1).max(MAX_BUY_ORDER_LENGTH),
  sessionId: z.string().min(1).max(MAX_SESSION_ID_LENGTH),
  discountCode: z.string().optional(),
  draft: z.object({
    input: z.string().trim().min(12).max(4_000),
    engineVersion: z.string().trim().min(1).max(100),
    aiConsentVersion: z.literal("ai-health-data-v1"),
    aiConsentAt: z.iso.datetime(),
    patientSex: z.enum(["female", "male", ""]).optional().default(""),
    patient: patientSchema,
    antecedents: symptomsAntecedentsSchema.partial().default({}),
    output: z.object({
      flowId: z.string().max(100).optional(),
      oneLinerSummary: z.string().min(1).max(2_000),
      primarySymptom: z.string().min(1).max(500),
      secondarySymptoms: z.array(z.string().max(500)).max(30).default([]),
      followUpQuestions: z.array(z.string().max(1_000)).max(30).default([]),
      probableContext: z.string().min(1).max(2_000),
      consultationFrame: z.string().min(1).max(2_000),
      tags: z.array(z.string().max(100)).max(30).default([]),
      urgencyWarning: z.boolean(),
      guidanceText: z.string().min(1).max(4_000),
    }),
  }),
});

function normalizeAntecedents(raw: Partial<SymptomsAntecedents>): SymptomsAntecedents {
  return {
    ...EMPTY_SYMPTOMS_ANTECEDENTS,
    ...raw,
  };
}

function mapCreatePaymentError(error: unknown): { status: number; message: string } {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      status: 503,
      message:
        "No pudimos conectar con nuestra base de datos en este momento. Intenta nuevamente en 1-2 minutos.",
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P1001") {
    return {
      status: 503,
      message:
        "No pudimos conectar con nuestra base de datos en este momento. Intenta nuevamente en 1-2 minutos.",
    };
  }

  const message =
    error instanceof Error ? error.message : "No pudimos crear la transacción en Transbank.";

  if (message.includes("Can't reach database server")) {
    return {
      status: 503,
      message:
        "No pudimos conectar con nuestra base de datos en este momento. Intenta nuevamente en 1-2 minutos.",
    };
  }

  return { status: 500, message };
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await enforceRateLimit({
      request,
      action: "symptoms:payment-create",
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    const parsed = payloadSchema.safeParse(await readJsonBody(request, 48_000));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido para pago de síntomas.", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const data = parsed.data;
    if (!BUY_ORDER_PATTERN.test(data.orderId)) {
      return NextResponse.json(
        { error: "orderId solo permite letras, números, guion y guion bajo." },
        { status: 400 },
      );
    }

    const discountCode = normalizeDiscountCode(data.discountCode);
    const appliedDiscount = await getDiscountByCode(discountCode);
    if (discountCode && !appliedDiscount) {
      return NextResponse.json({ error: "Código de descuento inválido." }, { status: 400 });
    }

    const pricing = calculateDiscountedAmount(SYMPTOMS_PRICE_CLP, appliedDiscount);
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    const user = await getUserFromSession(token);
    const currentAccessCookie = cookieStore.get(getRequestAccessCookieName())?.value;

    const existing = await getSymptomsRequest(data.orderId);
    if (existing) {
      if (existing.reviewStatus === "validated" || existing.reviewStatus === "rejected") {
        return NextResponse.json(
          { error: "Esta solicitud ya fue cerrada y no se puede modificar." },
          { status: 409 },
        );
      }
      if (existing.payment?.status === "paid") {
        return NextResponse.json(
          { error: "Esta solicitud ya tiene un pago confirmado." },
          { status: 409 },
        );
      }

      if (existing.userId) {
        if (!user || user.id !== existing.userId) {
          return NextResponse.json(
            { error: "No tienes acceso a esta solicitud." },
            { status: 403 },
          );
        }
      } else {
        const hasGuestAccess = hasValidRequestAccessCookie(currentAccessCookie, {
          requestType: "symptoms",
          requestId: existing.id,
          createdAtMs: existing.createdAt,
        });
        if (!hasGuestAccess) {
          return NextResponse.json(
            { error: "No tienes acceso a esta solicitud." },
            { status: 403 },
          );
        }
      }
    }

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

    const draft = await createOrUpdateSymptomsDraft({
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
      aiConsentAt: new Date(data.draft.aiConsentAt),
      aiConsentVersion: data.draft.aiConsentVersion,
      aiProvider: data.draft.engineVersion.startsWith("openai-") ? "openai" : "local",
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

    if (!user?.id) {
      const nextAccessCookie = upsertRequestAccessCookie(currentAccessCookie, {
        requestType: "symptoms",
        requestId: draft.id,
        createdAtMs: draft.createdAt,
      });

      cookieStore.set(getRequestAccessCookieName(), nextAccessCookie, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return NextResponse.json({
      requestId: data.orderId,
      token: created.token,
      url: created.url,
      amount: pricing.finalAmount,
      redirectUrl: `${created.url}?token_ws=${encodeURIComponent(created.token)}`,
    });
  } catch (error) {
    console.error("POST /api/sintomas/payments/create", error);
    const securityResponse = httpErrorResponse(error, "");
    if (securityResponse.status !== 500) return securityResponse;
    const mapped = mapCreatePaymentError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
