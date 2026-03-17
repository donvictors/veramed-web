export type SymptomsInterpretation = {
  flowId?: string;
  oneLinerSummary: string;
  primarySymptom: string;
  secondarySymptoms: string[];
  followUpQuestions: string[];
  probableContext: string;
  consultationFrame: string;
  tags: string[];
  urgencyWarning: boolean;
  guidanceText: string;
};

export type SymptomsInterpretationResult = {
  interpretation: SymptomsInterpretation;
  engineVersion: string;
  createdAt: string;
};

const RULES: Array<{
  id: string;
  flowId: string;
  matchers: RegExp[];
  interpretation: Omit<SymptomsInterpretation, "urgencyWarning">;
}> = [
  {
    id: "urinary-lower-tract",
    flowId: "dysuria_lower_uti",
    matchers: [/ardor/i, /orina/i, /orinar/i, /disuria/i, /urinaria/i, /bañ[oó]/i],
    interpretation: {
      flowId: "dysuria_lower_uti",
      oneLinerSummary: "Síntomas urinarios bajos de pocos días de evolución.",
      primarySymptom: "Disuria / molestias urinarias",
      secondarySymptoms: ["ardor al orinar", "frecuencia urinaria", "molestia suprapúbica"],
      followUpQuestions: [
        "¿Desde cuándo comenzaron estas molestias urinarias?",
        "¿Tienes fiebre o escalofríos?",
        "¿Has notado dolor en la zona lumbar o en los costados?",
        "¿Has visto sangre en la orina?",
      ],
      probableContext: "Síntomas urinarios bajos",
      consultationFrame: "Relato compatible con molestias urinarias de inicio ambulatorio",
      tags: ["ardor al orinar", "polaquiuria", "molestias urinarias"],
      guidanceText:
        "Para orientar mejor la evaluación, partiremos desde síntomas urinarios y luego ajustaremos preguntas de seguimiento.",
    },
  },
  {
    id: "headache",
    flowId: "headache",
    matchers: [/dolor de cabeza/i, /cefalea/i, /migra/i, /n[áa]usea/i, /fotofobia/i],
    interpretation: {
      flowId: "headache",
      oneLinerSummary: "Cefalea con síntomas asociados que requiere caracterización ambulatoria.",
      primarySymptom: "Cefalea",
      secondarySymptoms: ["náuseas", "fotofobia", "malestar general"],
      followUpQuestions: [
        "¿Cuánto tiempo llevas con este dolor de cabeza?",
        "¿El dolor apareció de forma súbita o progresiva?",
        "¿Tienes náuseas, vómitos o sensibilidad a la luz/ruido?",
        "¿Has tenido fiebre o rigidez de cuello?",
      ],
      probableContext: "Síntomas neurológicos no focales",
      consultationFrame: "Relato compatible con cuadro de cefalea a precisar",
      tags: ["cefalea", "náuseas", "sensibilidad a la luz"],
      guidanceText:
        "Usaremos cefalea como punto de partida y ordenaremos preguntas sobre duración, intensidad y síntomas asociados.",
    },
  },
  {
    id: "respiratory",
    flowId: "acute_cough",
    matchers: [/tos/i, /falta de aire/i, /disnea/i, /respirar/i, /pecho/i, /escaleras/i],
    interpretation: {
      flowId: "acute_cough",
      oneLinerSummary: "Cuadro respiratorio subagudo en evaluación ambulatoria inicial.",
      primarySymptom: "Síntomas respiratorios",
      secondarySymptoms: ["tos", "disnea de esfuerzo", "sensación de opresión torácica"],
      followUpQuestions: [
        "¿Hace cuántos días comenzó la tos o la falta de aire?",
        "¿Has tenido fiebre o expectoración?",
        "¿La falta de aire aparece en reposo o con esfuerzo?",
        "¿Tienes dolor de pecho al respirar o toser?",
      ],
      probableContext: "Cuadro respiratorio subagudo",
      consultationFrame: "Relato compatible con síntomas respiratorios en evaluación ambulatoria",
      tags: ["tos", "disnea de esfuerzo", "síntomas respiratorios"],
      guidanceText:
        "Vamos a organizar tu evaluación en torno a síntomas respiratorios para priorizar antecedentes y estudios iniciales.",
    },
  },
  {
    id: "digestive",
    flowId: "acute_abdominal_pain",
    matchers: [/abdomen/i, /guata/i, /v[óo]mito/i, /diarrea/i, /n[áa]usea/i, /digest/i],
    interpretation: {
      flowId: "acute_abdominal_pain",
      oneLinerSummary: "Síntomas digestivos inespecíficos en estudio ambulatorio.",
      primarySymptom: "Síntomas gastrointestinales",
      secondarySymptoms: ["dolor abdominal", "náuseas", "alteración digestiva"],
      followUpQuestions: [
        "¿En qué zona del abdomen sientes el dolor o molestia?",
        "¿Desde cuándo tienes estos síntomas digestivos?",
        "¿Has tenido vómitos, diarrea o fiebre?",
        "¿Los síntomas empeoran con comidas o en ayuno?",
      ],
      probableContext: "Molestias digestivas en evaluación ambulatoria",
      consultationFrame: "Relato compatible con cuadro digestivo inespecífico",
      tags: ["dolor abdominal", "náuseas", "síntomas digestivos"],
      guidanceText:
        "Tomaremos el eje digestivo como referencia para ordenar factores de riesgo, evolución y estudios orientadores.",
    },
  },
];

const URGENCY_TERMS: RegExp[] = [
  /dolor de pecho/i,
  /falta de aire intensa/i,
  /no puedo respirar/i,
  /desmayo/i,
  /sangrado activo/i,
  /convul/i,
  /debilidad de un lado/i,
  /confusi[oó]n/i,
];

function hasUrgencyWarning(text: string) {
  return URGENCY_TERMS.some((term) => term.test(text));
}

export function interpretSymptomsText(rawText: string): SymptomsInterpretation {
  const text = rawText.trim();
  const matchedRule = RULES.find((rule) =>
    rule.matchers.some((matcher) => matcher.test(text)),
  );
  const urgencyWarning = hasUrgencyWarning(text);

  if (matchedRule) {
    return {
      ...matchedRule.interpretation,
      urgencyWarning,
    };
  }

  return {
    flowId: "fatigue_weight_loss_general_symptoms",
    oneLinerSummary: "Síntomas generales inespecíficos en clasificación inicial ambulatoria.",
    primarySymptom: "Síntomas generales",
    secondarySymptoms: ["malestar general", "síntomas inespecíficos"],
    followUpQuestions: [
      "¿Desde cuándo notas estos síntomas?",
      "¿Han empeorado, mejorado o se mantienen igual?",
      "¿Has tenido fiebre, baja de peso o dolor en alguna zona específica?",
      "¿Hay algo que alivie o empeore los síntomas?",
    ],
    probableContext: "Motivo de consulta ambulatorio inespecífico",
    consultationFrame: "Relato clínico inicial en clasificación",
    tags: ["síntomas generales", "texto libre"],
    urgencyWarning,
    guidanceText:
      "Organizaremos tu relato en una categoría clínica inicial y luego afinaremos el motivo de consulta con preguntas dirigidas.",
  };
}
