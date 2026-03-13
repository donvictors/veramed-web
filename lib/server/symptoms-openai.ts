import { z } from "zod";
import { CLINICAL_FLOWS } from "@/lib/clinical/flows";
import type { SymptomsInterpretation } from "@/lib/symptoms-intake";
import type { SymptomsAntecedents } from "@/lib/symptoms-order";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 15000;

const FLOW_IDS = CLINICAL_FLOWS.map((flow) => flow.flowId);
const FLOW_LABELS = CLINICAL_FLOWS.map((flow) => `- ${flow.flowId}: ${flow.label}`).join("\n");

const openAIInterpretationSchema = z.object({
  flowId: z.string().refine((value) => FLOW_IDS.includes(value), {
    message: "flowId fuera de catálogo clínico",
  }),
  primarySymptom: z.string().min(3).max(120),
  probableContext: z.string().min(5).max(180),
  consultationFrame: z.string().min(5).max(220),
  tags: z.array(z.string().min(2).max(40)).min(1).max(6),
  urgencyWarning: z.boolean(),
  guidanceText: z.string().min(10).max(260),
});

type OpenAIInterpretation = z.infer<typeof openAIInterpretationSchema>;

function buildSystemPrompt() {
  return [
    "Eres un clasificador clínico inicial para un sistema ambulatorio de adultos.",
    "No diagnostiques, no indiques tratamientos, no confirmes enfermedad.",
    "Tu tarea es interpretar texto libre de síntomas y mapearlo a un flowId de un catálogo fijo.",
    "Debes responder SOLO JSON válido con la estructura solicitada.",
    "Si hay signos de posible gravedad, urgencyWarning=true.",
    "Selecciona un único flowId entre este catálogo:",
    FLOW_LABELS,
    "Si hay ambigüedad, usa fatigue_weight_loss_general_symptoms.",
    "Mantén lenguaje clínico prudente y orientado a evaluación, no diagnóstico.",
  ].join("\n");
}

function buildUserPrompt(
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
    "Antecedentes relevantes reportados por el paciente:",
    `- Sexo: ${sex}`,
    `- Edad: ${age}`,
    `- Antecedentes médicos: ${medicalHistory}`,
    `- Antecedentes quirúrgicos: ${surgicalHistory}`,
    `- Medicación crónica: ${chronicMedication}`,
    `- Alergias: ${allergies}`,
    `- Tabaco: ${smoking}`,
    `- Alcohol: ${alcoholUse}`,
    `- Drogas: ${drugUse}`,
    `- Actividad sexual: ${sexualActivity}`,
    `- Enfermedades familiares de primer grado: ${firstDegreeFamilyHistory}`,
    `- Ocupación: ${occupation}`,
    "",
    "Relato del paciente (texto libre):",
    symptomsText,
    "",
    "Devuelve JSON con estas claves exactas:",
    "flowId, primarySymptom, probableContext, consultationFrame, tags, urgencyWarning, guidanceText",
    "No incluyas markdown ni texto adicional.",
  ].join("\n");
}

function getModelName() {
  return process.env.OPENAI_SYMPTOMS_MODEL?.trim() || DEFAULT_MODEL;
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
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no está configurada.");
  }

  const model = getModelName();
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
        model,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(),
          },
          {
            role: "user",
            content: buildUserPrompt(symptomsText, antecedents, patientContext),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "symptoms_interpretation_v1",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: [
                "flowId",
                "primarySymptom",
                "probableContext",
                "consultationFrame",
                "tags",
                "urgencyWarning",
                "guidanceText",
              ],
              properties: {
                flowId: {
                  type: "string",
                  enum: FLOW_IDS,
                },
                primarySymptom: { type: "string" },
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
          },
        },
      }),
    });

    const payload = (await response.json().catch(() => null)) as
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
      const message = payload?.error?.message || `OpenAI HTTP ${response.status}`;
      throw new Error(message);
    }

    const rawContent = payload?.choices?.[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") {
      throw new Error("OpenAI no devolvió contenido JSON.");
    }

    const parsedJson = JSON.parse(rawContent) as OpenAIInterpretation;
    const parsed = openAIInterpretationSchema.parse(parsedJson);

    return {
      interpretation: {
        flowId: parsed.flowId,
        primarySymptom: parsed.primarySymptom,
        probableContext: parsed.probableContext,
        consultationFrame: parsed.consultationFrame,
        tags: parsed.tags,
        urgencyWarning: parsed.urgencyWarning,
        guidanceText: parsed.guidanceText,
      },
      model,
    };
  } finally {
    clearTimeout(timeout);
  }
}
