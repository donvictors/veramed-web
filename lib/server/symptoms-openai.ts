import { z } from "zod";
import { CLINICAL_FLOWS } from "@/lib/clinical/flows";
import { EXAM_MASTER_CATALOG } from "@/lib/exam-master-catalog";
import type { SymptomsInterpretation } from "@/lib/symptoms-intake";
import type { SymptomsAntecedents } from "@/lib/symptoms-order";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 20000;

const FLOW_IDS = CLINICAL_FLOWS.map((flow) => flow.flowId);
const FLOW_LABELS = CLINICAL_FLOWS.map((flow) => `- ${flow.flowId}: ${flow.label}`).join("\n");
const SUGGESTION_EXAMS = EXAM_MASTER_CATALOG.filter(
  (exam) =>
    exam.category === "laboratory" ||
    exam.category === "image" ||
    exam.category === "procedure",
);
const SUGGESTION_EXAM_NAMES = SUGGESTION_EXAMS.map((exam) => exam.name);
const SUGGESTION_EXAM_ENUM = [...SUGGESTION_EXAM_NAMES] as [string, ...string[]];

const openAIInterpretationSchema = z.object({
  flowId: z.string().refine((value) => FLOW_IDS.includes(value), {
    message: "flowId fuera de catálogo clínico",
  }),
  oneLinerSummary: z.string().min(8).max(180),
  primarySymptom: z.string().min(3).max(120),
  secondarySymptoms: z.array(z.string().min(2).max(80)).max(8).default([]),
  followUpQuestions: z.array(z.string().min(6).max(220)).min(3).max(10),
  probableContext: z.string().min(5).max(180),
  consultationFrame: z.string().min(5).max(220),
  tags: z.array(z.string().min(2).max(40)).min(1).max(6),
  urgencyWarning: z.boolean(),
  guidanceText: z.string().min(10).max(260),
});

const openAISuggestedExamsSchema = z.object({
  oneLinerSummary: z.string().min(5).max(220),
  suggestedExamNames: z.array(z.enum(SUGGESTION_EXAM_ENUM)).max(20),
  rationale: z.string().min(5).max(2000),
});

type OpenAIInterpretation = z.infer<typeof openAIInterpretationSchema>;
type OpenAISuggestedExams = z.infer<typeof openAISuggestedExamsSchema>;

function getModelName() {
  return process.env.OPENAI_SYMPTOMS_MODEL?.trim() || DEFAULT_MODEL;
}

function buildInterpretSystemPrompt() {
  return [
    "Eres un clasificador clínico inicial para atención ambulatoria de adultos.",
    "No diagnostiques, no indiques tratamientos, no confirmes enfermedades.",
    "Tu tarea es ordenar el relato clínico y mapearlo a un flowId del catálogo entregado.",
    "Debes responder SOLO JSON válido con la estructura solicitada.",
    "Si hay señales de alarma, urgencyWarning=true.",
    "Selecciona un único flowId entre este catálogo:",
    FLOW_LABELS,
    "Si hay ambigüedad usa fatigue_weight_loss_general_symptoms.",
  ].join("\n");
}

function buildInterpretUserPrompt(
  symptomsText: string,
  antecedents?: Partial<SymptomsAntecedents>,
  patientContext?: {
    sex?: "female" | "male" | "";
    age?: number;
  },
) {
  const medicalHistory = antecedents?.medicalHistory?.trim() || "No reportado";
  const surgicalHistory = antecedents?.surgicalHistory?.trim() || "No reportado";
  const chronicMedication = antecedents?.chronicMedication?.trim() || "No reportado";
  const allergies = antecedents?.allergies?.trim() || "No reportado";
  const smoking = antecedents?.smoking?.trim() || "No reportado";
  const alcoholUse = antecedents?.alcoholUse?.trim() || "No reportado";
  const drugUse = antecedents?.drugUse?.trim() || "No reportado";
  const sexualActivity = antecedents?.sexualActivity?.trim() || "No reportado";
  const firstDegreeFamilyHistory =
    antecedents?.firstDegreeFamilyHistory?.trim() || "No reportado";
  const occupation = antecedents?.occupation?.trim() || "No reportado";
  const sex =
    patientContext?.sex === "female"
      ? "Femenino"
      : patientContext?.sex === "male"
        ? "Masculino"
        : "No reportado";
  const age =
    typeof patientContext?.age === "number" && Number.isFinite(patientContext.age) && patientContext.age > 0
      ? `${Math.floor(patientContext.age)} años`
      : "No reportada";

  return [
    "Entrada clínica inicial:",
    `Sexo: ${sex}`,
    `Edad: ${age}`,
    `Síntomas en texto libre: ${symptomsText}`,
    "Antecedentes:",
    `- Médicos: ${medicalHistory}`,
    `- Quirúrgicos: ${surgicalHistory}`,
    `- Fármacos crónicos: ${chronicMedication}`,
    `- Alergias: ${allergies}`,
    `- Tabaco: ${smoking}`,
    `- Alcohol: ${alcoholUse}`,
    `- Drogas: ${drugUse}`,
    `- Actividad sexual: ${sexualActivity}`,
    `- Antecedentes familiares 1er grado: ${firstDegreeFamilyHistory}`,
    `- Ocupación: ${occupation}`,
    "",
    "Devuelve JSON con estas claves exactas:",
    "flowId, oneLinerSummary, primarySymptom, secondarySymptoms, followUpQuestions, probableContext, consultationFrame, tags, urgencyWarning, guidanceText",
    "followUpQuestions debe venir en orden lógico y en español.",
  ].join("\n");
}

function buildSuggestExamsSystemPrompt() {
  const catalogLines = SUGGESTION_EXAMS.map((exam) => {
    const prep = exam.orderObservation?.trim() || "Sin preparación especial.";
    return `- ${exam.name} | Tipo: ${exam.category} | Código FONASA: ${exam.fonasaCode} | Preparación: ${prep}`;
  }).join("\n");

  return [
    "Eres un asistente clínico para pre-órdenes ambulatorias de adultos.",
    "No diagnostiques ni des tratamiento.",
    "Tu tarea es sugerir exámenes SOLO desde el catálogo entregado.",
    "Objetivo clínico: ser sensible y no restrictivo en la evaluación inicial.",
    "Prioriza sensibilidad sobre especificidad: ante duda clínica razonable, prefiere incluir examen pertinente en vez de omitirlo.",
    "Incluye lo necesario para una evaluación amplia inicial, manteniendo coherencia clínica con el caso.",
    "Si tras una evaluación amplia no se requieren estudios iniciales, suggestedExamNames puede ser [].",
    "Responde SOLO JSON válido.",
    "Catálogo de exámenes disponibles (laboratorio, imagen y procedimiento):",
    catalogLines,
  ].join("\n");
}

function buildSuggestExamsUserPrompt(input: {
  cachedInput: string;
  oneLinerSummary: string;
  primarySymptom: string;
  secondarySymptoms: string[];
  followUpQA: Array<{ question: string; answer: string }>;
}) {
  const followUpLines = input.followUpQA
    .map((item, index) => `${index + 1}. Pregunta: ${item.question}\n   Respuesta: ${item.answer}`)
    .join("\n");

  return [
    "Contexto clínico inicial (entrada en caché):",
    input.cachedInput,
    "",
    "Resumen actual:",
    `- One-liner: ${input.oneLinerSummary}`,
    `- Síntoma principal: ${input.primarySymptom}`,
    `- Síntomas secundarios: ${input.secondarySymptoms.join(", ") || "No reportados"}`,
    "",
    "Respuestas de seguimiento:",
    followUpLines || "Sin respuestas",
    "",
    "Devuelve JSON con claves exactas:",
    "oneLinerSummary, suggestedExamNames, rationale",
    "suggestedExamNames debe usar nombres EXACTOS del catálogo.",
    "Prioriza una estrategia sensible (amplia) y no restrictiva para la evaluación inicial.",
  ].join("\n");
}

async function callOpenAIJsonSchema<T>(payload: {
  model: string;
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
}): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no está configurada.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: payload.model,
        temperature: 0.1,
        messages: [
          { role: "system", content: payload.systemPrompt },
          { role: "user", content: payload.userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: payload.schemaName,
            strict: true,
            schema: payload.schema,
          },
        },
      }),
    });

    const responsePayload = (await response.json().catch(() => null)) as
      | {
          error?: { message?: string };
          choices?: Array<{
            message?: {
              content?: string | null;
            };
          }>;
        }
      | null;

    if (!response.ok) {
      const message = responsePayload?.error?.message || `OpenAI HTTP ${response.status}`;
      throw new Error(message);
    }

    const rawContent = responsePayload?.choices?.[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") {
      throw new Error("OpenAI no devolvió contenido JSON.");
    }

    return JSON.parse(rawContent) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function interpretSymptomsWithOpenAI(
  symptomsText: string,
  antecedents?: Partial<SymptomsAntecedents>,
  patientContext?: {
    sex?: "female" | "male" | "";
    age?: number;
  },
): Promise<{
  interpretation: SymptomsInterpretation;
  model: string;
}> {
  const model = getModelName();
  const parsedJson = await callOpenAIJsonSchema<OpenAIInterpretation>({
    model,
    schemaName: "symptoms_interpretation_v2",
    systemPrompt: buildInterpretSystemPrompt(),
    userPrompt: buildInterpretUserPrompt(symptomsText, antecedents, patientContext),
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "flowId",
        "oneLinerSummary",
        "primarySymptom",
        "secondarySymptoms",
        "followUpQuestions",
        "probableContext",
        "consultationFrame",
        "tags",
        "urgencyWarning",
        "guidanceText",
      ],
      properties: {
        flowId: { type: "string", enum: FLOW_IDS },
        oneLinerSummary: { type: "string" },
        primarySymptom: { type: "string" },
        secondarySymptoms: {
          type: "array",
          items: { type: "string" },
          maxItems: 8,
        },
        followUpQuestions: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 10,
        },
        probableContext: { type: "string" },
        consultationFrame: { type: "string" },
        tags: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          maxItems: 6,
        },
        urgencyWarning: { type: "boolean" },
        guidanceText: { type: "string" },
      },
    },
  });

  const parsed = openAIInterpretationSchema.parse(parsedJson);

  return {
    interpretation: {
      flowId: parsed.flowId,
      oneLinerSummary: parsed.oneLinerSummary,
      primarySymptom: parsed.primarySymptom,
      secondarySymptoms: parsed.secondarySymptoms,
      followUpQuestions: parsed.followUpQuestions,
      probableContext: parsed.probableContext,
      consultationFrame: parsed.consultationFrame,
      tags: parsed.tags,
      urgencyWarning: parsed.urgencyWarning,
      guidanceText: parsed.guidanceText,
    },
    model,
  };
}

export async function suggestSymptomsExamsWithOpenAI(input: {
  cachedInput: string;
  oneLinerSummary: string;
  primarySymptom: string;
  secondarySymptoms: string[];
  followUpQA: Array<{ question: string; answer: string }>;
}): Promise<{
  suggestedExamNames: string[];
  oneLinerSummary: string;
  rationale: string;
  model: string;
}> {
  const model = getModelName();
  const parsedJson = await callOpenAIJsonSchema<OpenAISuggestedExams>({
    model,
    schemaName: "symptoms_exam_suggestion_v1",
    systemPrompt: buildSuggestExamsSystemPrompt(),
    userPrompt: buildSuggestExamsUserPrompt(input),
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["oneLinerSummary", "suggestedExamNames", "rationale"],
      properties: {
        oneLinerSummary: { type: "string" },
        suggestedExamNames: {
          type: "array",
          items: { type: "string", enum: SUGGESTION_EXAM_NAMES },
          maxItems: 20,
        },
        rationale: { type: "string", maxLength: 2000 },
      },
    },
  });

  const parsed = openAISuggestedExamsSchema.parse(parsedJson);
  const deduped = Array.from(new Set(parsed.suggestedExamNames));
  const normalizedRationale = parsed.rationale.trim().slice(0, 1200);

  return {
    suggestedExamNames: deduped,
    oneLinerSummary: parsed.oneLinerSummary,
    rationale: normalizedRationale || "Sugerencia de exámenes basada en la evaluación clínica guiada.",
    model,
  };
}
