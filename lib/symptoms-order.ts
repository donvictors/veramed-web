import { createVerificationCode, type TestItem } from "@/lib/checkup";

export type SymptomsOrderInput = {
  symptomsText: string;
  interpretation: {
    primarySymptom: string;
    probableContext: string;
    consultationFrame: string;
    tags: string[];
  };
  answers: {
    evolution?: string;
    intensity?: string;
    associated?: string;
    background?: string;
  };
  createdAtMs?: number;
};

export type SymptomsOrderDraft = {
  id: string;
  issuedAtMs: number;
  verificationCode: string;
  summary: string;
  symptomsText: string;
  interpretation: SymptomsOrderInput["interpretation"];
  answers: SymptomsOrderInput["answers"];
  tests: TestItem[];
  notes: string[];
};

const BASE_TESTS: Array<{ keywords: RegExp[]; tests: TestItem[] }> = [
  {
    keywords: [/orina|orinar|ardor|disuria|urin/i],
    tests: [
      { name: "Orina completa", why: "Síntomas urinarios declarados por el paciente." },
      { name: "Urocultivo", why: "Apoyo microbiológico en contexto urinario." },
      { name: "Creatinina en sangre", why: "Evaluación renal inicial en contexto urinario." },
    ],
  },
  {
    keywords: [/cabeza|cefalea|migra|nausea|náusea|fotofobia/i],
    tests: [
      { name: "Hemograma", why: "Evaluación basal en cuadro sintomático inespecífico." },
      { name: "Perfil bioquímico", why: "Panel general para evaluación clínica inicial." },
      { name: "Proteína C reactiva (PCR)", why: "Apoyo inflamatorio según presentación clínica." },
    ],
  },
  {
    keywords: [/tos|falta de aire|disnea|respirar|pecho/i],
    tests: [
      { name: "Radiografía de tórax", why: "Evaluación inicial de síntomas respiratorios." },
      {
        name: "Espirometría basal y post broncodilatador",
        why: "Apoyo funcional respiratorio según relato clínico.",
      },
      { name: "Hemograma", why: "Evaluación basal en cuadro respiratorio." },
    ],
  },
  {
    keywords: [/abdomen|abdominal|guata|vomito|vómito|diarrea|digest/i],
    tests: [
      { name: "Perfil bioquímico", why: "Evaluación metabólica y orgánica inicial." },
      { name: "Perfil hepático", why: "Apoyo clínico en síntomas digestivos." },
      { name: "Hemograma", why: "Evaluación basal en contexto gastrointestinal." },
    ],
  },
];

const FALLBACK_TESTS: TestItem[] = [
  { name: "Hemograma", why: "Evaluación clínica basal inicial." },
  { name: "Perfil bioquímico", why: "Panel general para orientar la evaluación ambulatoria." },
  { name: "Glucosa en sangre", why: "Apoyo metabólico inicial." },
];

function pushUnique(target: Map<string, TestItem>, incoming: TestItem) {
  if (!target.has(incoming.name)) {
    target.set(incoming.name, { ...incoming });
    return;
  }

  const current = target.get(incoming.name);
  if (current && !current.why.includes(incoming.why)) {
    current.why = `${current.why} ${incoming.why}`;
  }
}

function generateOrderId() {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 46656)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0");
  return `sym_${now}${rand}`.slice(0, 22);
}

export function buildSymptomsOrder(input: SymptomsOrderInput): SymptomsOrderDraft {
  const text = input.symptomsText.trim();
  const lowerText = text.toLowerCase();
  const testsMap = new Map<string, TestItem>();

  for (const rule of BASE_TESTS) {
    const matched = rule.keywords.some((keyword) => keyword.test(lowerText));
    if (!matched) continue;
    for (const test of rule.tests) {
      pushUnique(testsMap, test);
    }
  }

  if (testsMap.size === 0) {
    for (const test of FALLBACK_TESTS) {
      pushUnique(testsMap, test);
    }
  }

  if ((input.answers.intensity ?? "").toLowerCase().includes("alto")) {
    pushUnique(testsMap, {
      name: "Proteína C reactiva (PCR)",
      why: "Se añade por alta interferencia reportada en rutina diaria.",
    });
  }

  const issuedAtMs = input.createdAtMs ?? Date.now();
  const notes = [
    "Orden sugerida a partir de relato libre de síntomas y preguntas de precisión clínica.",
    "La emisión final está sujeta a revisión médica antes de uso formal.",
  ];

  return {
    id: generateOrderId(),
    issuedAtMs,
    verificationCode: createVerificationCode("", issuedAtMs),
    summary: `Se identificaron ${testsMap.size} exámenes sugeridos para orientar tu consulta por síntomas.`,
    symptomsText: text,
    interpretation: input.interpretation,
    answers: input.answers,
    tests: Array.from(testsMap.values()),
    notes,
  };
}
