import { NextResponse } from "next/server";
import { interpretSymptomsText } from "@/lib/symptoms-intake";
import { interpretSymptomsWithOpenAI } from "@/lib/server/symptoms-openai";
import { EMPTY_SYMPTOMS_ANTECEDENTS, type SymptomsAntecedents } from "@/lib/symptoms-order";

type InterpretBody = {
  symptomsText?: string;
  antecedents?: Partial<SymptomsAntecedents>;
  patientContext?: {
    sex?: "female" | "male" | "";
    age?: number;
  };
};

const MIN_SYMPTOM_TEXT_LENGTH = 12;
const ENGINE_VERSION_FALLBACK = "sintomas-intake-local-v1";

export async function POST(request: Request) {
  let body: InterpretBody;

  try {
    body = (await request.json()) as InterpretBody;
  } catch {
    return NextResponse.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  const symptomsText = body.symptomsText?.trim() ?? "";
  const antecedents: SymptomsAntecedents = {
    ...EMPTY_SYMPTOMS_ANTECEDENTS,
    ...(body.antecedents ?? {}),
  };

  if (!symptomsText) {
    return NextResponse.json(
      { error: "Debes ingresar un relato de síntomas." },
      { status: 400 },
    );
  }

  if (symptomsText.length < MIN_SYMPTOM_TEXT_LENGTH) {
    return NextResponse.json(
      {
        error:
          "Para orientar mejor la evaluación, describe tus síntomas con más detalle (al menos 12 caracteres).",
      },
      { status: 400 },
    );
  }

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
    console.error("OpenAI síntomas: fallback a motor local", error);
  }

  return NextResponse.json({
    interpretation,
    engineVersion,
    createdAt: new Date().toISOString(),
    nextStep: {
      route: "/sintomas/pago",
      storageKey: "veramed_symptoms_intake_v1",
    },
  });
}
