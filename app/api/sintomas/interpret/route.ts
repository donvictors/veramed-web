import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { calculateAgeFromBirthDate } from "@/lib/checkup";
import { interpretSymptomsText } from "@/lib/symptoms-intake";
import { interpretSymptomsWithOpenAI } from "@/lib/server/symptoms-openai";
import {
  ADAPTIVE_INTERVIEW_VERSION,
  createFallbackClinicalPlan,
} from "@/lib/server/symptoms-interview";
import {
  createInitialInterviewMetadata,
  type InterviewQuestionCandidate,
  type SymptomsClinicalState,
} from "@/lib/server/symptoms-clinical-state";
import {
  filterCandidatesForClinicalState,
  filterQuestionCandidatesForContext,
  mergeCandidateQueues,
} from "@/lib/server/symptoms-interview-engine.mjs";
import { EMPTY_SYMPTOMS_ANTECEDENTS, type SymptomsAntecedents } from "@/lib/symptoms-order";
import { getUserFromSession } from "@/lib/server/auth-store";
import {
  enforceRateLimit,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";
import { interpretSymptomsSchema } from "@/lib/server/request-schemas";
import {
  buildSymptomsCachedInput,
  createOrUpdateSymptomsDraft,
} from "@/lib/server/symptoms-store";
import {
  getRequestAccessCookieName,
  upsertRequestAccessCookie,
} from "@/lib/server/request-access";

const ENGINE_VERSION_FALLBACK = `sintomas-intake-local-v1+${ADAPTIVE_INTERVIEW_VERSION}`;
const AI_CONSENT_VERSION = "ai-health-data-v1";

export const runtime = "nodejs";

function createSymptomsRequestId() {
  return `sym_${randomUUID().replaceAll("-", "").slice(0, 22)}`;
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await enforceRateLimit({
      request,
      action: "symptoms:interpret",
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    const parsed = interpretSymptomsSchema.safeParse(await readJsonBody(request, 24_000));
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Revisa el relato, sus antecedentes y confirma el consentimiento para el procesamiento asistido.",
          details: parsed.error.issues,
        },
        { status: 400 },
      );
    }
    const body = parsed.data;
    const symptomsText = body.symptomsText;
    const antecedents: SymptomsAntecedents = {
      ...EMPTY_SYMPTOMS_ANTECEDENTS,
      ...body.antecedents,
    };
    const patientAge = calculateAgeFromBirthDate(body.patient.birthDate);
    const patientSex = body.patientContext?.sex ?? "";

    let interpretation = interpretSymptomsText(symptomsText);
    let engineVersion = ENGINE_VERSION_FALLBACK;
    let planOrigin: "llm" | "fallback" = "fallback";
    let modelName = "deterministic-fallback";
    let fallbackPlan = createFallbackClinicalPlan({
      interpretation,
      symptomsText,
      sex: patientSex,
    });
    let clinicalState: SymptomsClinicalState = fallbackPlan.clinicalState;
    let candidateQuestions: InterviewQuestionCandidate[] = fallbackPlan.queue;

    try {
      if (process.env.OPENAI_API_KEY?.trim()) {
        const openAIResult = await interpretSymptomsWithOpenAI(
          symptomsText,
          antecedents,
          { sex: patientSex, age: patientAge },
        );
        interpretation = openAIResult.interpretation;
        fallbackPlan = createFallbackClinicalPlan({ interpretation, symptomsText, sex: patientSex });
        clinicalState = openAIResult.clinicalState;
        candidateQuestions = mergeCandidateQueues({
          generated: filterCandidatesForClinicalState(
            filterQuestionCandidatesForContext(openAIResult.candidateQuestions, {
              sex: patientSex,
              flowId: interpretation.flowId,
            }),
            openAIResult.clinicalState,
          ),
          retained: [],
          askedQuestions: [],
        }) as InterviewQuestionCandidate[];
        if (candidateQuestions.length < 3) candidateQuestions = fallbackPlan.queue;
        interpretation = {
          ...interpretation,
          followUpQuestions: candidateQuestions.map((candidate) => candidate.question),
        };
        planOrigin = "llm";
        modelName = openAIResult.model;
        engineVersion = `openai-${openAIResult.model}+${ADAPTIVE_INTERVIEW_VERSION}`;
      }
    } catch (error) {
      console.error("OpenAI síntomas: fallback a motor local", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    }

    if (planOrigin === "fallback") {
      fallbackPlan = createFallbackClinicalPlan({ interpretation, symptomsText, sex: patientSex });
      clinicalState = fallbackPlan.clinicalState;
      candidateQuestions = fallbackPlan.queue;
      interpretation = {
        ...interpretation,
        followUpQuestions: candidateQuestions.map((candidate) => candidate.question),
      };
    }

    const interviewMetadata = createInitialInterviewMetadata({
      currentQuestion: candidateQuestions[0] ?? null,
      origin: planOrigin,
      model: modelName,
      warningActive: interpretation.urgencyWarning,
    });

    const requestId = createSymptomsRequestId();
    const consentAt = new Date();
    const cachedInput = buildSymptomsCachedInput({
      sex:
        patientSex === "female"
          ? "Femenino"
          : patientSex === "male"
            ? "Masculino"
            : "",
      age: patientAge,
      symptomsText,
      antecedents,
    });
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    const user = await getUserFromSession(sessionToken);
    const draft = await createOrUpdateSymptomsDraft({
      id: requestId,
      userId: user?.id,
      symptomsText,
      patient: {
        ...body.patient,
        sex: patientSex,
      },
      interpretation,
      antecedents,
      engineVersion,
      cachedInput,
      aiConsentAt: consentAt,
      aiConsentVersion: AI_CONSENT_VERSION,
      aiProvider: engineVersion.startsWith("openai-") ? "openai" : "local",
      clinicalState,
      candidateQuestions,
      interviewMetadata,
    });

    if (!user?.id) {
      const accessCookieName = getRequestAccessCookieName();
      const currentAccessCookie = cookieStore.get(accessCookieName)?.value;
      const nextAccessCookie = upsertRequestAccessCookie(currentAccessCookie, {
        requestType: "symptoms",
        requestId: draft.id,
        createdAtMs: draft.createdAt,
      });
      cookieStore.set(accessCookieName, nextAccessCookie, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return NextResponse.json({
      requestId: draft.id,
      interpretation,
      engineVersion,
      aiConsentVersion: AI_CONSENT_VERSION,
      createdAt: new Date(draft.createdAt).toISOString(),
      nextStep: {
        route: "/sintomas/pago",
        storageKey: "veramed_symptoms_intake_v1",
      },
    });
  } catch (error) {
    console.error("POST /api/sintomas/interpret failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return httpErrorResponse(error, "No pudimos interpretar el relato en este momento.");
  }
}
