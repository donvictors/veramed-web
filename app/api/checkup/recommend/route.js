import { NextResponse } from "next/server";
import {
  buildCheckupPreventiveRecommendation,
  getCheckupPreventiveSeedMetadata,
  validateCheckupPreventiveInput
} from "@/lib/server/checkup-preventive-recommendation-engine.mjs";

export async function POST(request) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "El cuerpo debe ser un JSON válido."
      },
      { status: 400 }
    );
  }

  const validation = validateCheckupPreventiveInput(payload);

  if (!validation.ok) {
    return NextResponse.json(
      {
        error: "Hay errores de validación en la solicitud.",
        details: validation.errors
      },
      { status: 400 }
    );
  }

  const recommendation = buildCheckupPreventiveRecommendation(validation.value);

  return NextResponse.json({
    ...recommendation,
    source: getCheckupPreventiveSeedMetadata()
  });
}
