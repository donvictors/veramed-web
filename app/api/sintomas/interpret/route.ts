import { NextResponse } from "next/server";
import { interpretSymptomsText } from "@/lib/symptoms-intake";
import { interpretSymptomsWithOpenAI } from "@/lib/server/symptoms-openai";
import { EMPTY_SYMPTOMS_ANTECEDENTS, type SymptomsAntecedents } from "@/lib/symptoms-order";
import {
  enforceRateLimit,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";
import { interpretSymptomsSchema } from "@/lib/server/request-schemas";

const ENGINE_VERSION_FALLBACK = "sintomas-intake-local-v1";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await enforceRateLimit({
      request,
      action: "symptoms:interpret",
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    const parsed = interpretSymptomsSchema.safeParse(await readJsonBody(request, 16_000));
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

    let interpretation = interpretSymptomsText(symptomsText);
    let engineVersion = ENGINE_VERSION_FALLBACK;

    try {
      if (process.env.OPENAI_API_KEY?.trim()) {
        const openAIResult = await interpretSymptomsWithOpenAI(
          symptomsText,
          antecedents,
          body.patientContext,
        );
        interpretation = openAIResult.interpretation;
        engineVersion = `openai-${openAIResult.model}`;
      }
    } catch (error) {
      console.error("OpenAI síntomas: fallback a motor local", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    }

    return NextResponse.json({
      interpretation,
      engineVersion,
      aiConsentVersion: "ai-health-data-v1",
      createdAt: new Date().toISOString(),
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
