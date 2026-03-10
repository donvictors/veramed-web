export type SymptomsInterpretation = {
  primarySymptom: string;
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
  matchers: RegExp[];
  interpretation: Omit<SymptomsInterpretation, "urgencyWarning">;
}> = [
  {
    id: "urinary-lower-tract",
    matchers: [/ardor/i, /orina/i, /orinar/i, /disuria/i, /urinaria/i, /bañ[oó]/i],
    interpretation: {
      primarySymptom: "Disuria / molestias urinarias",
      probableContext: "Síntomas urinarios bajos",
      consultationFrame: "Relato compatible con molestias urinarias de inicio ambulatorio",
      tags: ["ardor al orinar", "polaquiuria", "molestias urinarias"],
      guidanceText:
        "Para orientar mejor la evaluación, partiremos desde síntomas urinarios y luego ajustaremos preguntas de seguimiento.",
    },
  },
  {
    id: "headache",
    matchers: [/dolor de cabeza/i, /cefalea/i, /migra/i, /n[áa]usea/i, /fotofobia/i],
    interpretation: {
      primarySymptom: "Cefalea",
      probableContext: "Síntomas neurológicos no focales",
      consultationFrame: "Relato compatible con cuadro de cefalea a precisar",
      tags: ["cefalea", "náuseas", "sensibilidad a la luz"],
      guidanceText:
        "Usaremos cefalea como punto de partida y ordenaremos preguntas sobre duración, intensidad y síntomas asociados.",
    },
  },
  {
    id: "respiratory",
    matchers: [/tos/i, /falta de aire/i, /disnea/i, /respirar/i, /pecho/i, /escaleras/i],
    interpretation: {
      primarySymptom: "Síntomas respiratorios",
      probableContext: "Cuadro respiratorio subagudo",
      consultationFrame: "Relato compatible con síntomas respiratorios en evaluación ambulatoria",
      tags: ["tos", "disnea de esfuerzo", "síntomas respiratorios"],
      guidanceText:
        "Vamos a organizar tu evaluación en torno a síntomas respiratorios para priorizar antecedentes y estudios iniciales.",
    },
  },
  {
    id: "digestive",
    matchers: [/abdomen/i, /guata/i, /v[óo]mito/i, /diarrea/i, /n[áa]usea/i, /digest/i],
    interpretation: {
      primarySymptom: "Síntomas gastrointestinales",
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
    primarySymptom: "Síntomas generales",
    probableContext: "Motivo de consulta ambulatorio inespecífico",
    consultationFrame: "Relato clínico inicial en clasificación",
    tags: ["síntomas generales", "texto libre"],
    urgencyWarning,
    guidanceText:
      "Organizaremos tu relato en una categoría clínica inicial y luego afinaremos el motivo de consulta con preguntas dirigidas.",
  };
}
