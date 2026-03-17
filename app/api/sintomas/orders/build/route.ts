import { NextResponse } from "next/server";
import { z } from "zod";
import { getExamMetadataByName } from "@/lib/exam-master-catalog";
import { buildSymptomsOrderFromEngine } from "@/lib/server/symptoms-order-engine";
import { toSymptomsOrderDraftFromRecord } from "@/lib/server/symptoms-order-mapper";
import { suggestSymptomsExamsWithOpenAI } from "@/lib/server/symptoms-openai";
import { getSymptomsRequest, saveSymptomsOrderDraft } from "@/lib/server/symptoms-store";
import type { SymptomsFlowAnswerMap } from "@/lib/symptoms-order";
import type { TestItem } from "@/lib/checkup";

const buildOrderBodySchema = z.object({
  requestId: z.string().min(1),
  answers: z.record(z.string(), z.string()).default({}),
});

function mapFollowUpToPairs(questions: string[], answers: SymptomsFlowAnswerMap) {
  return questions.map((question, index) => ({
    question,
    answer: answers[`q_${index}`] ?? "",
  }));
}

function normalizeSuggestedTests(examNames: string[], rationale: string): TestItem[] {
  return examNames
    .map((name) => {
      const metadata = getExamMetadataByName(name);
      if (!metadata) return null;
      return {
        name: metadata.name,
        why: rationale,
      };
    })
    .filter((item): item is TestItem => Boolean(item));
}

function fallbackNotesFromRecord() {
  return ["Orden sugerida por motor clínico con respaldo determinista y revisión médica pendiente."];
}

function buildDeterministicFallback(requestRecord: {
  symptomsText: string;
  patient: {
    fullName: string;
    rut: string;
    birthDate: string;
    email: string;
    phone: string;
    address: string;
  };
  interpretation: Parameters<typeof buildSymptomsOrderFromEngine>[0]["interpretation"];
  antecedents: Parameters<typeof buildSymptomsOrderFromEngine>[0]["antecedents"];
}, followUpAnswers: SymptomsFlowAnswerMap) {
  return buildSymptomsOrderFromEngine({
    symptomsText: requestRecord.symptomsText,
    patient: {
      fullName: requestRecord.patient.fullName,
      rut: requestRecord.patient.rut,
      birthDate: requestRecord.patient.birthDate,
      email: requestRecord.patient.email,
      phone: requestRecord.patient.phone,
      address: requestRecord.patient.address,
    },
    interpretation: requestRecord.interpretation,
    antecedents: requestRecord.antecedents,
    answers: followUpAnswers,
  });
}

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

  const requestRecord = await getSymptomsRequest(parsed.data.requestId);
  if (!requestRecord) {
    return NextResponse.json({ error: "Solicitud de síntomas no encontrada." }, { status: 404 });
  }

  if (!requestRecord.payment || requestRecord.payment.status !== "paid") {
    return NextResponse.json(
      { error: "La solicitud aún no tiene pago confirmado." },
      { status: 409 },
    );
  }

  const followUpAnswers = parsed.data.answers;
  const followUpQA = mapFollowUpToPairs(requestRecord.followUpQuestions, followUpAnswers);

  try {
    let suggestedTests: TestItem[] = [];
    let notes: string[] = [];
    let oneLinerSummary = requestRecord.oneLinerSummary;
    let usedOpenAI = false;

    if (process.env.OPENAI_API_KEY?.trim()) {
      try {
        const openAI = await suggestSymptomsExamsWithOpenAI({
          cachedInput: requestRecord.cachedInput,
          oneLinerSummary: requestRecord.oneLinerSummary,
          primarySymptom: requestRecord.primarySymptom,
          secondarySymptoms: requestRecord.secondarySymptoms,
          followUpQA,
        });
        suggestedTests = normalizeSuggestedTests(openAI.suggestedExamNames, openAI.rationale);
        oneLinerSummary = openAI.oneLinerSummary;
        notes = [
          "Orden sugerida por análisis de IA sobre historia clínica y preguntas de seguimiento.",
          openAI.rationale,
        ];
        usedOpenAI = true;
      } catch (openAIError) {
        console.error("OpenAI suggestions fallback to deterministic engine:", openAIError);
      }
    }

    if (!usedOpenAI) {
      const deterministic = buildDeterministicFallback(
        {
          symptomsText: requestRecord.symptomsText,
          patient: {
            fullName: requestRecord.patient.fullName,
            rut: requestRecord.patient.rut,
            birthDate: requestRecord.patient.birthDate,
            email: requestRecord.patient.email,
            phone: requestRecord.patient.phone,
            address: requestRecord.patient.address,
          },
          interpretation: requestRecord.interpretation,
          antecedents: requestRecord.antecedents,
        },
        followUpAnswers,
      );
      suggestedTests = deterministic.order.tests;
      notes = fallbackNotesFromRecord();
      oneLinerSummary = deterministic.order.interpretation.oneLinerSummary;
    }

    const saved = await saveSymptomsOrderDraft({
      requestId: requestRecord.id,
      followUpAnswers,
      suggestedTests,
      notes,
      oneLinerSummary,
    });

    const order = toSymptomsOrderDraftFromRecord(saved);

    return NextResponse.json({
      order: {
        ...order,
        reviewStatus: saved.reviewStatus,
      },
      engineVersion: "symptoms-openai-lab-suggestions-v1",
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible construir la orden por síntomas.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
