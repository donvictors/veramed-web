import { NextResponse } from "next/server";
import { z } from "zod";
import { buildSymptomsOrderFromEngine } from "@/lib/server/symptoms-order-engine";

const buildOrderBodySchema = z.object({
  symptomsText: z.string().min(1),
  patient: z.object({
    fullName: z.string().min(1),
    rut: z.string().min(1),
    birthDate: z.string().min(1),
    email: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    address: z.string().optional().default(""),
  }),
  interpretation: z.object({
    flowId: z.string().min(1),
    primarySymptom: z.string().min(1),
    probableContext: z.string().min(1),
    consultationFrame: z.string().min(1),
    tags: z.array(z.string()),
    urgencyWarning: z.boolean(),
    guidanceText: z.string().min(1),
  }),
  antecedents: z
    .object({
      medicalHistory: z.string().optional(),
      surgicalHistory: z.string().optional(),
      chronicMedication: z.string().optional(),
      allergies: z.string().optional(),
    })
    .optional(),
  answers: z.record(z.string(), z.string()).default({}),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  const parsed = buildOrderBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Payload inválido para construir la orden por síntomas.",
      },
      { status: 400 },
    );
  }

  try {
    const built = buildSymptomsOrderFromEngine(parsed.data);
    return NextResponse.json({
      order: built.order,
      nextStep: built.nextStep,
      hardStopTriggered: built.hardStopTriggered,
      engineVersion: "clinical-deterministic-v1",
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible construir la orden con el motor clínico.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
