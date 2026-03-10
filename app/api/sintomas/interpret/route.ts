import { NextResponse } from "next/server";
import { interpretSymptomsText } from "@/lib/symptoms-intake";

type InterpretBody = {
  symptomsText?: string;
};

const MIN_SYMPTOM_TEXT_LENGTH = 12;
const ENGINE_VERSION = "sintomas-intake-mock-v1";

export async function POST(request: Request) {
  let body: InterpretBody;

  try {
    body = (await request.json()) as InterpretBody;
  } catch {
    return NextResponse.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  const symptomsText = body.symptomsText?.trim() ?? "";

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

  const interpretation = interpretSymptomsText(symptomsText);

  return NextResponse.json({
    interpretation,
    engineVersion: ENGINE_VERSION,
    createdAt: new Date().toISOString(),
    nextStep: {
      route: "/sintomas/flujo",
      storageKey: "veramed_symptoms_intake_v1",
    },
  });
}
