const MAX_QUEUE_SIZE = 3;

const DOMAIN_LIBRARY = {
  anorectal_alarm: {
    label: "Fiebre y aumento de volumen perianal", priority: 5,
    clinicalImpact: "Distingue infección perianal que requiere examen físico prioritario.",
    question: "¿El dolor anal es continuo? ¿Tienes fiebre o escalofríos, o notas un bulto o aumento de volumen alrededor del ano?",
    quickReplies: [], coverageTerms: ["continuo", "fiebre", "escalofr", "bulto", "masa", "volumen"],
    coverageGroups: [["continuo", "solo al", "defec"], ["fiebre", "escalofr"], ["bulto", "masa", "volumen"]],
  },
  anorectal_defecation: {
    label: "Defecación y sangrado anal", priority: 5,
    clinicalImpact: "Distingue un patrón de fisura de sangrado significativo.",
    question: "¿El dolor aparece o empeora al defecar? ¿Hay sangre y, si la hay, es poca al limpiarte o un sangrado abundante?",
    quickReplies: [], coverageTerms: ["defec", "depos", "sangr", "rectorrag"],
    coverageGroups: [["defec", "depos"], ["sangr", "rectorrag"]],
  },
  anorectal_discharge: {
    label: "Secreción anal y lesiones", priority: 4,
    clinicalImpact: "Orienta a proctitis, fístula o lesión local y al sitio correcto de muestra.",
    question: "¿Sale secreción o pus desde el ano, o has notado heridas o úlceras en esa zona?",
    quickReplies: [], coverageTerms: ["secrecion", "pus", "herida", "ulcera"],
    coverageGroups: [["secrecion", "pus"], ["herida", "ulcera", "lesion"]],
  },
  anorectal_bowel: {
    label: "Diarrea y tenesmo", priority: 4,
    clinicalImpact: "Distingue inflamación rectal o intestinal del dolor anal aislado.",
    question: "¿Tienes diarrea o ganas persistentes de defecar aunque salga poco o nada (tenesmo)?",
    quickReplies: [], coverageTerms: ["diarrea", "tenesmo", "ganas"],
    coverageGroups: [["diarrea"], ["tenesmo", "ganas"]],
  },
  anorectal_risks: {
    label: "Riesgos de infección e inflamación intestinal", priority: 4,
    clinicalImpact: "Ajusta gravedad y diferencial ante diabetes, inmunosupresión o EII.",
    question: "¿Tienes diabetes, defensas bajas o usas inmunosupresores? ¿Tienes enfermedad de Crohn o colitis ulcerosa?",
    quickReplies: [], coverageTerms: ["diabetes", "defensas", "inmuno", "crohn", "colitis"],
    coverageGroups: [["diabetes"], ["defensas", "inmuno"], ["crohn", "colitis", "eii"]],
  },
  anorectal_exposure: {
    label: "Exposición anal relevante", priority: 4, sensitive: true,
    clinicalImpact: "Define pertinencia de estudio de ITS en muestra rectal, no urinaria por defecto.",
    question: "Para orientar la evaluación de estos síntomas, ¿hubo contacto sexual anal receptivo reciente (genital, oral o con dedos/juguetes), y se usó barrera de protección?",
    quickReplies: [], coverageTerms: ["anal", "receptiv", "preservativo", "barrera"],
    coverageGroups: [["anal", "receptiv"], ["preservativo", "barrera", "proteccion"]],
  },

  onset: {
    label: "Inicio y evolución",
    priority: 5,
    clinicalImpact: "Distingue cuadros agudos, progresivos y recurrentes.",
    question: "¿Cuándo comenzaron tus síntomas y cómo han evolucionado desde entonces?",
    quickReplies: ["Hoy", "Hace 2–3 días", "Hace una semana", "Más de un mes"],
    coverageTerms: ["desde", "comenz", "inicio", "hace", "días", "seman", "mes", "repentino", "gradual"],
  },
  severity: {
    label: "Intensidad e impacto",
    priority: 4,
    clinicalImpact: "Define gravedad funcional y velocidad de evaluación.",
    question: "¿Qué intensidad tiene y cuánto limita tus actividades habituales?",
    quickReplies: ["Leve", "Moderada", "Intensa", "No puedo hacer mis actividades"],
    coverageTerms: ["leve", "moderad", "intens", "fuerte", "dolor", "limita", "actividades", "10"],
  },
  associated: {
    label: "Síntomas asociados",
    priority: 4,
    clinicalImpact: "Identifica agrupaciones clínicas y posibles cambios de prioridad.",
    question: "¿Qué otros síntomas aparecieron junto con este problema?",
    quickReplies: [],
    coverageTerms: ["además", "también", "fiebre", "náuse", "vom", "tos", "mare", "sangr", "falta de aire"],
  },
  modifiers: {
    label: "Factores modificadores",
    priority: 3,
    clinicalImpact: "Aclara desencadenantes, alivio y agravantes.",
    question: "¿Hay algo que lo desencadene, lo alivie o lo empeore?",
    quickReplies: ["Con el esfuerzo", "Con las comidas", "En reposo", "Nada en particular"],
    coverageTerms: ["empeora", "mejora", "alivia", "desencadena", "esfuerzo", "comida", "reposo", "movimiento"],
  },
  recurrence: {
    label: "Episodios previos",
    priority: 2,
    clinicalImpact: "Diferencia primer episodio de un patrón recurrente.",
    question: "¿Habías tenido antes un episodio igual o parecido?",
    quickReplies: ["No, es primera vez", "Sí, una vez", "Sí, varias veces"],
    coverageTerms: ["primera vez", "antes", "episodio", "recurrent", "varias veces", "nunca"],
  },
  respiratory_alarm: {
    label: "Compromiso respiratorio",
    priority: 5,
    clinicalImpact: "Descarta dificultad respiratoria clínicamente relevante.",
    question: "¿Tienes falta de aire en reposo, labios morados o dificultad para hablar por la respiración?",
    quickReplies: ["No", "Falta de aire leve", "Sí, en reposo", "Me cuesta hablar"],
    coverageTerms: ["falta de aire", "respirar", "reposo", "labios", "morado", "hablar"],
  },
  chest_alarm: {
    label: "Características torácicas de alarma",
    priority: 5,
    clinicalImpact: "Detecta patrones torácicos que requieren evaluación oportuna.",
    question: "¿El dolor es opresivo, aparece con esfuerzo o se acompaña de sudor frío, náuseas o falta de aire?",
    quickReplies: ["No", "Con esfuerzo", "Es opresivo", "Con falta de aire"],
    coverageTerms: ["opres", "esfuerzo", "sudor", "náuse", "falta de aire", "pecho"],
  },
  neurologic_alarm: {
    label: "Alarma neurológica",
    priority: 5,
    clinicalImpact: "Busca déficit neurológico, convulsión o inicio explosivo.",
    question: "¿El síntoma comenzó de golpe o se acompaña de debilidad de un lado, dificultad para hablar, desmayo o convulsión?",
    quickReplies: ["No", "Comenzó de golpe", "Tuve desmayo", "Tengo debilidad o dificultad para hablar"],
    coverageTerms: ["de golpe", "repentino", "debilidad", "hablar", "desmayo", "convul"],
  },
  fever_infection: {
    label: "Fiebre e infección",
    priority: 4,
    clinicalImpact: "Orienta a un proceso infeccioso y su severidad.",
    question: "¿Has tenido fiebre medida, escalofríos o decaimiento importante?",
    quickReplies: ["No", "Fiebre bajo 38 °C", "Fiebre de 38 °C o más", "Escalofríos intensos"],
    coverageTerms: ["fiebre", "temperatura", "38", "escalofr", "decaimiento"],
  },
  bleeding: {
    label: "Sangrado",
    priority: 5,
    clinicalImpact: "Detecta pérdidas de sangre relevantes y signos de inestabilidad.",
    question: "¿Has presentado sangrado abundante, vómitos con sangre, deposiciones negras o mareos intensos?",
    quickReplies: ["No", "Sangrado leve", "Sangrado abundante", "Deposiciones negras o vómitos con sangre"],
    coverageTerms: ["sangr", "negra", "vómito con sangre", "mareo", "abundante"],
  },
  hydration: {
    label: "Hidratación y tolerancia oral",
    priority: 4,
    clinicalImpact: "Estima riesgo de deshidratación.",
    question: "¿Puedes beber líquidos y estás orinando con una frecuencia parecida a la habitual?",
    quickReplies: ["Sí, normal", "Bebo menos", "Vomito los líquidos", "Casi no estoy orinando"],
    coverageTerms: ["líquido", "agua", "beber", "vomito", "orinando", "orina", "deshidrat"],
  },
  location_radiation: {
    label: "Localización e irradiación",
    priority: 4,
    clinicalImpact: "Precisa el territorio anatómico comprometido.",
    question: "¿En qué parte exacta lo sientes y se extiende hacia otra zona?",
    quickReplies: [],
    coverageTerms: ["lado", "derech", "izquierd", "centro", "arriba", "abajo", "irrad", "extiende"],
  },
  bowel_pattern: {
    label: "Patrón digestivo",
    priority: 3,
    clinicalImpact: "Caracteriza tránsito, vómitos y relación digestiva.",
    question: "¿Ha cambiado tu tránsito intestinal o has tenido náuseas, vómitos o distensión abdominal?",
    quickReplies: ["No", "Diarrea", "Estreñimiento", "Náuseas o vómitos"],
    coverageTerms: ["diarrea", "estreñ", "depos", "náuse", "vom", "distensión"],
  },
  urinary_pattern: {
    label: "Patrón urinario",
    priority: 4,
    clinicalImpact: "Caracteriza síntomas urinarios bajos y altos.",
    question: "¿Tienes ardor al orinar, urgencia, aumento de frecuencia, sangre en la orina o dolor en la espalda?",
    quickReplies: ["Solo ardor", "Urgencia o frecuencia", "Sangre en la orina", "Dolor en la espalda"],
    coverageTerms: ["ardor", "orinar", "urgencia", "frecuencia", "sangre", "espalda", "flanco"],
  },
  genital_localization: {
    label: "Localización genital y origen de secreción",
    priority: 5,
    clinicalImpact: "Distingue compromiso urinario, genital, pélvico y escrotal y cambia las alarmas relevantes.",
    question: "¿Dónde sientes exactamente el dolor y desde dónde sale la secreción: uretra, vagina, piel o una lesión?",
    quickReplies: ["Pene o uretra", "Testículo o escroto", "Vagina o pelvis", "Piel o una lesión"],
    coverageTerms: ["pene", "uretra", "testículo", "escroto", "vagina", "pelvis", "piel", "lesión", "secreción"],
    sensitive: true,
  },
  pregnancy: {
    label: "Posibilidad de embarazo",
    priority: 5,
    clinicalImpact: "Modifica la evaluación de dolor, sangrado y retraso menstrual.",
    question: "¿Existe posibilidad de embarazo o tienes atraso menstrual?",
    quickReplies: ["No", "Sí", "No estoy segura", "Uso anticonceptivo"],
    coverageTerms: ["embarazo", "embarazada", "atraso", "retraso", "menstru", "anticoncept"],
    sensitive: true,
  },
  gynecologic: {
    label: "Síntomas ginecológicos",
    priority: 4,
    clinicalImpact: "Relaciona dolor, flujo y sangrado con el ciclo menstrual.",
    question: "¿Tienes sangrado vaginal, flujo distinto a lo habitual o dolor relacionado con tu ciclo menstrual?",
    quickReplies: ["No", "Sangrado", "Flujo distinto", "Dolor con el ciclo"],
    coverageTerms: ["vaginal", "flujo", "menstru", "ciclo", "sangrado"],
    sensitive: true,
  },
  scrotal_alarm: {
    label: "Dolor testicular agudo",
    priority: 5,
    clinicalImpact: "Detecta dolor testicular súbito que requiere evaluación urgente.",
    question: "¿El dolor testicular comenzó de forma súbita e intensa, con aumento de volumen, náuseas o un testículo más alto?",
    quickReplies: ["No", "Fue súbito e intenso", "Hay aumento de volumen", "Se acompaña de náuseas"],
    coverageTerms: ["testículo", "testicular", "escroto", "súbito", "intenso", "volumen", "náuse"],
    sensitive: true,
  },
  discharge_exposure: {
    label: "Secreción y exposición sexual",
    priority: 3,
    clinicalImpact: "Orienta causas infecciosas genitourinarias cuando es pertinente.",
    question: "¿Has notado secreción genital, lesiones o una exposición sexual reciente que te preocupe?",
    quickReplies: ["No", "Sí, secreción", "Sí, lesiones", "Sí, posible exposición"],
    coverageTerms: ["secreción", "flujo", "lesión", "sexual", "exposición"],
    sensitive: true,
  },
  skin_extent: {
    label: "Extensión y mucosas",
    priority: 4,
    clinicalImpact: "Detecta extensión rápida y compromiso de mucosas.",
    question: "¿La lesión se está extendiendo rápido o afecta ojos, boca, genitales o gran parte del cuerpo?",
    quickReplies: ["No", "Se extiende rápido", "Afecta boca u ojos", "Es extensa"],
    coverageTerms: ["extiende", "rápido", "ojos", "boca", "genital", "cuerpo", "extensa"],
  },
  trauma_joint: {
    label: "Trauma y función articular",
    priority: 4,
    clinicalImpact: "Define mecanismo, apoyo y limitación funcional.",
    question: "¿Comenzó después de un golpe o torcedura, y puedes mover o apoyar la zona?",
    quickReplies: ["Sin trauma", "Después de un golpe", "Después de una torcedura", "No puedo apoyar o mover"],
    coverageTerms: ["golpe", "torcedura", "caída", "trauma", "apoyar", "mover"],
  },
  joint_inflammation: {
    label: "Inflamación articular",
    priority: 4,
    clinicalImpact: "Identifica articulación caliente, roja o muy inflamada.",
    question: "¿La zona está hinchada, roja, caliente o muy dolorosa al moverla?",
    quickReplies: ["No", "Está hinchada", "Está roja o caliente", "Duele mucho al mover"],
    coverageTerms: ["hinch", "roja", "caliente", "inflam", "mover"],
  },
  mental_safety: {
    label: "Seguridad en salud mental",
    priority: 5,
    clinicalImpact: "Detecta riesgo inmediato para la persona.",
    question: "¿Has pensado en hacerte daño o sientes que no puedes mantenerte a salvo?",
    quickReplies: ["No", "He tenido pensamientos, sin intención", "Sí, me preocupa mi seguridad"],
    coverageTerms: ["hacerme daño", "suic", "seguridad", "morir"],
    sensitive: true,
  },
  systemic: {
    label: "Síntomas sistémicos",
    priority: 4,
    clinicalImpact: "Caracteriza fiebre, baja de peso, sudoración y deterioro general.",
    question: "¿Has tenido fiebre, baja de peso involuntaria, sudoración nocturna o pérdida importante de energía?",
    quickReplies: ["No", "Fiebre", "Baja de peso", "Sudoración nocturna"],
    coverageTerms: ["fiebre", "peso", "sudor", "energía", "cansancio"],
  },
};

const FLOW_DOMAINS = {
  sore_throat: ["onset", "severity", "fever_infection", "respiratory_alarm", "associated"],
  acute_cough: ["onset", "respiratory_alarm", "fever_infection", "associated", "modifiers"],
  dyspnea: ["onset", "respiratory_alarm", "chest_alarm", "severity", "associated"],
  chest_pain: ["chest_alarm", "onset", "severity", "location_radiation", "associated"],
  palpitations: ["onset", "severity", "chest_alarm", "neurologic_alarm", "modifiers"],
  headache: ["onset", "neurologic_alarm", "severity", "associated", "recurrence"],
  dizziness_vertigo: ["onset", "neurologic_alarm", "severity", "associated", "modifiers"],
  syncope_presyncope: ["neurologic_alarm", "chest_alarm", "onset", "associated", "recurrence"],
  acute_abdominal_pain: ["onset", "location_radiation", "severity", "bowel_pattern", "pregnancy", "bleeding"],
  nausea_vomiting: ["onset", "hydration", "severity", "bowel_pattern", "pregnancy", "bleeding"],
  diarrhea: ["onset", "hydration", "bleeding", "fever_infection", "associated"],
  constipation: ["onset", "severity", "bowel_pattern", "bleeding", "associated"],
  dyspepsia_reflux: ["onset", "modifiers", "bleeding", "severity", "associated"],
  dysuria_lower_uti: ["urinary_pattern", "fever_infection", "onset", "genital_localization", "pregnancy", "discharge_exposure"],
  hematuria_flank_pain: ["urinary_pattern", "severity", "fever_infection", "bleeding", "onset", "genital_localization"],
  abnormal_uterine_bleeding: ["bleeding", "pregnancy", "gynecologic", "onset", "severity"],
  amenorrhea_menstrual_delay: ["pregnancy", "gynecologic", "onset", "systemic", "associated"],
  vaginal_discharge_pelvic_pain: ["genital_localization", "gynecologic", "pregnancy", "discharge_exposure", "fever_infection", "severity"],
  breast_symptoms: ["onset", "location_radiation", "fever_infection", "associated", "pregnancy"],
  scrotal_pain_swelling: ["scrotal_alarm", "onset", "severity", "urinary_pattern", "discharge_exposure"],
  rash_urticaria_pruritus: ["skin_extent", "onset", "respiratory_alarm", "associated", "modifiers"],
  joint_pain_swollen_joint: ["trauma_joint", "joint_inflammation", "onset", "fever_infection", "severity"],
  low_back_pain_sciatica: ["onset", "severity", "neurologic_alarm", "trauma_joint", "modifiers"],
  anxiety_panic_insomnia_low_mood: ["mental_safety", "onset", "severity", "associated", "modifiers"],
  fatigue_weight_loss_general_symptoms: ["systemic", "onset", "severity", "associated", "bleeding"],
};

const PIVOTS = [
  { id: "scrotal_acute", pattern: /dolor (?:de |en (?:un |el )?)?(?:test[ií]culo|testicular|escroto).{0,65}(?:s[uú]bit|repentin|de golpe|intens|muy fuerte|insoportable)|(?:s[uú]bit|repentin|de golpe|intens|muy fuerte|insoportable).{0,65}(?:test[ií]culo|testicular|escroto)/i, flowId: "scrotal_pain_swelling", reason: "Dolor testicular súbito o intenso declarado.", urgent: true },
  { id: "genital_infectious", pattern: /secreci[oó]n|flujo genital|lesi[oó]n genital/i, requires: /sin preservativo|pareja nueva|contacto sexual|ardor al orinar|disuria/i, flowId: "dysuria_lower_uti", reason: "Aparece un componente genitourinario o sexual que cambia las prioridades.", urgent: false },
  { id: "chest_pain", pattern: /dolor|presi[oó]n|opresi[oó]n/i, requires: /pecho|t[oó]rax|tor[aá]c/i, flowId: "chest_pain", reason: "Aparece un síntoma torácico relevante.", urgent: false },
  { id: "dyspnea", pattern: /falta de aire|dificultad para respirar|me cuesta respirar/i, flowId: "dyspnea", reason: "Aparece dificultad respiratoria.", urgent: true },
  { id: "pregnancy", pattern: /embaraz|atraso menstrual|retraso menstrual/i, flowId: "amenorrhea_menstrual_delay", reason: "Aparece posibilidad de embarazo.", urgent: false },
  { id: "neurologic", pattern: /debilidad (?:de|en) un lado|dificultad para hablar|cara desviada|convulsi[oó]n/i, flowId: "headache", reason: "Aparece una señal neurológica relevante.", urgent: true },
];

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canAskSensitive(domain, context) {
  if (!domain.sensitive) return true;
  if (domain.id === "pregnancy" || domain.id === "gynecologic") {
    return context.sex === "female";
  }
  if (domain.id === "scrotal_alarm") return context.sex === "male";
  if (domain.id === "discharge_exposure") {
    return context.sex === "female" || context.sex === "male" || context.sexualContext === true;
  }
  if (domain.id === "genital_localization") return context.sex === "female" || context.sex === "male";
  return true;
}

export function getClinicalMap(flowId, context = {}) {
  const resolvedFlowId = FLOW_DOMAINS[flowId] ? flowId : "fatigue_weight_loss_general_symptoms";
  const initialText = normalize(context.symptomsText ?? "");
  const sexualGenitourinarySignal =
    /secrecion|flujo|sin preservativo|sexo sin|pareja nueva|lesion genital/.test(initialText);
  const activatedDomains = sexualGenitourinarySignal
    ? [
        "genital_localization",
        context.sex === "male" ? "scrotal_alarm" : "pregnancy",
        "fever_infection",
        "discharge_exposure",
      ]
    : [];
  const anorectal = /\b(?:anal|ano|rectal|perianal|anorrectal|rectorragia|tenesmo)\b/.test(initialText);
  const domainIds = anorectal
    ? ["anorectal_alarm", "anorectal_defecation", "onset", "anorectal_discharge", "anorectal_bowel", "anorectal_risks", "urinary_pattern",
      ...(/secrecion|tenesmo|sexual|receptiv|ulcera/.test(initialText) ? ["anorectal_exposure"] : [])]
    : [...new Set([...activatedDomains, ...FLOW_DOMAINS[resolvedFlowId]])];
  const domains = domainIds
    .map((id) => ({ id, ...DOMAIN_LIBRARY[id], impactAreas: impactAreasForDomain(id) }))
    .filter((domain) => canAskSensitive(domain, { ...context, sexualContext: sexualGenitourinarySignal }));
  return { flowId: resolvedFlowId, domains };
}

function impactAreasForDomain(domainId) {
  const urgency = new Set([
    "anorectal_alarm", "anorectal_defecation", "anorectal_risks",
    "respiratory_alarm", "chest_alarm", "neurologic_alarm", "bleeding", "hydration",
    "pregnancy", "scrotal_alarm", "skin_extent", "mental_safety", "fever_infection",
  ]);
  const testing = new Set([
    "fever_infection", "bleeding", "hydration", "urinary_pattern", "pregnancy",
    "gynecologic", "discharge_exposure", "systemic", "joint_inflammation", "genital_localization",
  ]);
  const result = [];
  if (urgency.has(domainId)) result.push("urgency");
  result.push("differential");
  if (testing.has(domainId) || !urgency.has(domainId)) result.push("testing");
  return [...new Set(result)];
}

export function createQuestionCandidate(domain, origin = "fallback") {
  return {
    id: `${domain.id}-${origin}`,
    question: domain.question,
    quickReplies: domain.quickReplies ?? [],
    targetDomain: domain.id,
    priority: domain.priority,
    clinicalImpact: domain.clinicalImpact,
    impactAreas: impactAreasForDomain(domain.id),
    sensitive: Boolean(domain.sensitive),
    origin,
  };
}

export function createInitialClinicalPlan({ flowId, summary, primarySymptom, symptomsText, sex = "" }) {
  const map = getClinicalMap(flowId, { sex, symptomsText });
  const queue = map.domains.slice(0, MAX_QUEUE_SIZE).map((domain) => createQuestionCandidate(domain));
  return {
    clinicalState: {
      version: "clinical-state-v2",
      facts: [{
        id: "initial-relato",
        label: primarySymptom || "Relato inicial",
        value: symptomsText,
        status: "reported",
        source: "initial",
        turn: 0,
      }],
      activeSyndromes: [{
        id: map.flowId,
        label: primarySymptom || map.flowId,
        likelihood: "primary",
        basis: [summary || symptomsText].filter(Boolean),
      }],
      redFlags: [],
      pendingDomains: map.domains.map((domain) => ({
        id: domain.id,
        label: domain.label,
        priority: domain.priority,
        clinicalImpact: domain.clinicalImpact,
        impactAreas: impactAreasForDomain(domain.id),
      })),
      updatedSummary: summary,
      readyToComplete: false,
    },
    queue,
  };
}

export function detectMaterialPivot(text) {
  for (const pivot of PIVOTS) {
    if (!pivot.pattern.test(text)) continue;
    if (pivot.requires && !pivot.requires.test(text)) continue;
    return pivot;
  }
  return null;
}

function answerCoversDomain(answer, domainId) {
  const domain = DOMAIN_LIBRARY[domainId];
  if (!domain) return false;
  const normalized = normalize(answer);
  if (domain.coverageGroups) return domain.coverageGroups.every(group => group.some(term => normalized.includes(normalize(term))));
  const hits = domain.coverageTerms.filter((term) => normalized.includes(normalize(term))).length;
  return hits >= (normalized.split(" ").length > 10 ? 1 : 2);
}

export function reconcileQuestionQueue({ state, queue, currentQuestion, answer, askedQuestions, turnNumber }) {
  const pivot = detectMaterialPivot(answer);
  const answeredDomain = currentQuestion?.targetDomain || "clinical-detail";
  const resolvedDomains = new Set([answeredDomain]);
  for (const candidate of queue) {
    if (answerCoversDomain(answer, candidate.targetDomain)) resolvedDomains.add(candidate.targetDomain);
  }

  const nextState = {
    ...state,
    facts: [
      ...(Array.isArray(state?.facts) ? state.facts : []),
      {
        id: `answer-${turnNumber}-${answeredDomain}`,
        label: currentQuestion?.question || "Respuesta clínica",
        value: answer,
        status: "reported",
        source: "answer",
        turn: turnNumber,
      },
    ],
    activeSyndromes: [...(Array.isArray(state?.activeSyndromes) ? state.activeSyndromes : [])],
    redFlags: [...(Array.isArray(state?.redFlags) ? state.redFlags : [])],
    pendingDomains: (Array.isArray(state?.pendingDomains) ? state.pendingDomains : []).filter(
      (domain) => !resolvedDomains.has(domain.id),
    ),
    readyToComplete: Boolean(state?.readyToComplete),
  };

  if (pivot) {
    nextState.readyToComplete = false;
    if (!nextState.activeSyndromes.some((syndrome) => syndrome.id === pivot.flowId)) {
      nextState.activeSyndromes.push({
        id: pivot.flowId,
        label: pivot.reason,
        likelihood: "secondary",
        basis: [answer],
      });
    }
    if (pivot.urgent && !nextState.redFlags.some((flag) => flag.id === pivot.id)) {
      nextState.redFlags.push({
        id: pivot.id,
        label: pivot.reason,
        status: "present",
        priority: "high",
        source: "deterministic",
      });
    }
    return {
      state: nextState,
      queue: [],
      invalidated: true,
      invalidationReason: pivot.reason,
      pivot,
      resolvedDomains: [...resolvedDomains],
    };
  }

  const asked = new Set((askedQuestions ?? []).map(normalize));
  const filtered = queue.filter(
    (candidate) =>
      !resolvedDomains.has(candidate.targetDomain) &&
      !asked.has(normalize(candidate.question)),
  );
  return {
    state: nextState,
    queue: filtered.slice(0, MAX_QUEUE_SIZE),
    invalidated: filtered.length !== queue.length,
    invalidationReason:
      filtered.length !== queue.length
        ? "La respuesta resolvió uno o más dominios de preguntas futuras."
        : "",
    pivot: null,
    resolvedDomains: [...resolvedDomains],
  };
}

export function buildFallbackQueue({ flowId, state, existingQueue = [], askedQuestions = [], sex = "", symptomsText = "" }) {
  const asked = new Set(askedQuestions.map(normalize));
  const queuedDomains = new Set(existingQueue.map((item) => item.targetDomain));
  const pending = new Set((state?.pendingDomains ?? []).map((domain) => domain.id));
  const map = getClinicalMap(flowId, { sex, symptomsText });
  const additions = map.domains
    .filter((domain) => pending.has(domain.id))
    .filter((domain) => !queuedDomains.has(domain.id))
    .map((domain) => createQuestionCandidate(domain))
    .filter((candidate) => !asked.has(normalize(candidate.question)));
  return [...existingQueue, ...additions]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_QUEUE_SIZE);
}

export function shouldCompleteAdaptiveInterview({ completedTurns, state, queue }) {
  if (completedTurns >= 8) return { complete: true, reason: "maximum_turns" };
  const pending = Array.isArray(state?.pendingDomains) ? state.pendingDomains : [];
  const unresolvedHighImpact = pending.some((domain) => domain.priority >= 4);
  const unresolvedRedFlag = (state?.redFlags ?? []).some(
    (flag) =>
      flag.status === "uncertain" && (flag.priority === "critical" || flag.priority === "high"),
  );
  if (state?.readyToComplete && !unresolvedHighImpact && !unresolvedRedFlag) {
    return { complete: true, reason: "clinical_state_ready" };
  }
  if (completedTurns >= 1 && pending.length === 0 && queue.length === 0) {
    return { complete: true, reason: "no_high_yield_domains" };
  }
  return { complete: false, reason: "continue" };
}

export function isQuestionSafeAndNovel(candidate, askedQuestions = []) {
  const question = String(candidate?.question ?? "").trim();
  if (question.length < 6 || question.length > 240 || !question.endsWith("?")) return false;
  if (/\b(?:nombre|rut|correo|e-?mail|tel[eé]fono|direcci[oó]n)\b/i.test(question)) return false;
  if (/\b(?:diagn[oó]stic|tratamiento|receta|debes tomar|suspende|probablemente tienes)\b/i.test(question)) return false;
  const normalized = normalize(question);
  return !askedQuestions.some((asked) => normalize(asked) === normalized);
}

export function mergeCandidateQueues({ retained = [], generated = [], askedQuestions = [] }) {
  const seenDomains = new Set();
  const seenQuestions = new Set(askedQuestions.map(normalize));
  return [...retained, ...generated]
    .sort((a, b) => b.priority - a.priority)
    .filter((candidate) => {
      const question = normalize(candidate.question);
      if (!isQuestionSafeAndNovel(candidate, askedQuestions)) return false;
      if (seenDomains.has(candidate.targetDomain) || seenQuestions.has(question)) return false;
      seenDomains.add(candidate.targetDomain);
      seenQuestions.add(question);
      return true;
    })
    .slice(0, MAX_QUEUE_SIZE);
}

export function filterQuestionCandidatesForContext(candidates, { sex = "" } = {}) {
  return candidates.filter((candidate) => {
    if (!candidate.sensitive) return true;
    if (candidate.targetDomain === "pregnancy" || candidate.targetDomain === "gynecologic") {
      return sex === "female";
    }
    if (candidate.targetDomain === "scrotal_alarm") return sex === "male";
    if (candidate.targetDomain === "mental_safety") return true;
    return true;
  });
}

export function filterCandidatesForClinicalState(candidates, state) {
  const pendingDomains = new Set((state?.pendingDomains ?? []).map((domain) => domain.id));
  return candidates.filter((candidate) => pendingDomains.has(candidate.targetDomain));
}

export const SYMPTOMS_FLOW_IDS = Object.freeze(Object.keys(FLOW_DOMAINS));
export const INTERVIEW_QUEUE_LIMIT = MAX_QUEUE_SIZE;

/** Restore missing discriminators even if a model stops early. Still one visible question. */
export function ensureAnorectalDiscriminators({ state, queue, symptomsText, answeredDomains = [], answeredQuestions = [], completedTurns }) {
  const map = getClinicalMap("fatigue_weight_loss_general_symptoms", { symptomsText });
  if (!map.domains.some(domain => domain.id === "anorectal_alarm") || completedTurns >= 8) return { state, queue };
  const answered = new Set(answeredDomains);
  const missing = map.domains.filter(domain => domain.id.startsWith("anorectal_"))
    .filter(domain => !answered.has(domain.id))
    .filter(domain => !answeredQuestions.some(question => normalize(question) === normalize(domain.question)))
    .filter(domain => !answerCoversDomain(symptomsText, domain.id));
  if (!missing.length) return { state, queue };
  const byId = new Map(state.pendingDomains.map(domain => [domain.id, domain]));
  for (const domain of missing) byId.set(domain.id, {
    id: domain.id, label: domain.label, priority: domain.priority,
    clinicalImpact: domain.clinicalImpact, impactAreas: domain.impactAreas,
  });
  const pendingIds = new Set(missing.map(domain => domain.id));
  const nextQueue = [...queue.filter(question => !pendingIds.has(question.targetDomain)), ...missing.map(domain => createQuestionCandidate(domain))]
    .sort((a, b) => b.priority - a.priority).slice(0, MAX_QUEUE_SIZE);
  return { state: { ...state, readyToComplete: false, pendingDomains: [...byId.values()].slice(0, 12) }, queue: nextQueue };
}
