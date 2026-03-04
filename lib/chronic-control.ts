export type ChronicCondition =
  | "hypertension"
  | "ischemic_heart_disease"
  | "heart_failure"
  | "atrial_fibrillation"
  | "type2_diabetes"
  | "obesity_metabolic_syndrome"
  | "dyslipidemia"
  | "hypothyroidism"
  | "copd"
  | "asthma"
  | "osteoporosis"
  | "rheumatoid_arthritis"
  | "chronic_kidney_disease"
  | "chronic_liver_disease_masld"
  | "chronic_hiv";

export type ControlTest = {
  name: string;
  why: string;
};

export type MedicationOption =
  | "metformin"
  | "corticosteroids"
  | "lithium"
  | "antiepileptics"
  | "immunosuppressants"
  | "antidepressants"
  | "warfarin";

export type ChronicControlRecommendation = {
  summary: string;
  tests: ControlTest[];
  notes: string[];
};

export type StoredChronicControl = {
  conditions: ChronicCondition[];
  patient?: import("./checkup").PatientDetails;
  yearsSinceDiagnosis: number;
  hasRecentChanges: boolean;
  usesMedication: boolean;
  selectedMedications: MedicationOption[];
  rec: ChronicControlRecommendation;
};

export const CHRONIC_CONTROL_PRICE_CLP = 3990;

export const CONDITION_OPTIONS: ChronicCondition[] = [
  "hypertension",
  "ischemic_heart_disease",
  "heart_failure",
  "atrial_fibrillation",
  "type2_diabetes",
  "obesity_metabolic_syndrome",
  "dyslipidemia",
  "hypothyroidism",
  "copd",
  "asthma",
  "osteoporosis",
  "rheumatoid_arthritis",
  "chronic_kidney_disease",
  "chronic_liver_disease_masld",
  "chronic_hiv",
];

export const MEDICATION_OPTIONS: MedicationOption[] = [
  "metformin",
  "corticosteroids",
  "lithium",
  "antiepileptics",
  "immunosuppressants",
  "antidepressants",
  "warfarin",
];

const MEDICATION_TESTS: Record<MedicationOption, ControlTest[]> = {
  metformin: [
    { name: "B12", why: "Seguimiento de déficit asociado a uso crónico de metformina." },
  ],
  corticosteroids: [
    { name: "Densitometría", why: "Control de riesgo óseo asociado a uso de corticoides." },
    { name: "Calcio", why: "Seguimiento del metabolismo mineral." },
    { name: "Vitamina D", why: "Apoyo al control de salud ósea." },
    { name: "Glicemia", why: "Pesquisa de alteraciones glicémicas asociadas a corticoides." },
    { name: "Perfil lipídico", why: "Seguimiento metabólico por impacto de tratamiento." },
  ],
  lithium: [
    { name: "Litio plasmático", why: "Monitoreo terapéutico del tratamiento con litio." },
    { name: "Creatinina", why: "Seguimiento de función renal durante el tratamiento." },
    { name: "TSH", why: "Control de función tiroidea asociado a uso de litio." },
    { name: "Electrolitos", why: "Monitoreo de equilibrio electrolítico." },
  ],
  antiepileptics: [
    { name: "Hemograma", why: "Seguimiento hematológico durante uso de antiepilépticos." },
    { name: "Perfil hepático", why: "Control de seguridad hepática del tratamiento." },
  ],
  immunosuppressants: [
    { name: "Hemograma", why: "Monitoreo hematológico durante tratamiento inmunosupresor." },
    { name: "Perfil hepático", why: "Control de seguridad hepática del tratamiento." },
  ],
  antidepressants: [
    {
      name: "Electrolitos plasmáticos",
      why: "Seguimiento de sodio y otros electrolitos en uso de antidepresivos.",
    },
  ],
  warfarin: [{ name: "INR", why: "Control de anticoagulación con warfarina." }],
};

export function recommendChronicControl(
  condition: ChronicCondition,
  hasRecentChanges: boolean,
): ChronicControlRecommendation {
  const baseMap: Record<ChronicCondition, ChronicControlRecommendation> = {
    hypertension: {
      summary: "Control de hipertensión arterial con foco renal, metabólico y cardiovascular.",
      tests: [
        { name: "Creatinina / eGFR", why: "Seguimiento de función renal en hipertensión." },
        { name: "Potasio", why: "Monitoreo de efecto de tratamiento y balance electrolítico." },
        { name: "Perfil lipídico", why: "Estratificación de riesgo cardiovascular." },
        { name: "Glicemia o HbA1c", why: "Evaluación metabólica y de riesgo cardiometabólico." },
        { name: "Microalbuminuria", why: "Pesquisa precoz de daño renal asociado." },
        { name: "ECG", why: "Evaluación cardiovascular basal o de seguimiento." },
      ],
      notes: ["Ideal complementar con control de presión arterial y revisión de tratamiento."],
    },
    ischemic_heart_disease: {
      summary:
        "Control de cardiopatía isquémica en contexto de antecedente de infarto o pre-infarto.",
      tests: [
        { name: "Perfil lipídico", why: "Seguimiento de control lipídico secundario." },
        { name: "HbA1c", why: "Evaluación de riesgo metabólico y control glucémico." },
        { name: "Función renal", why: "Monitoreo de función renal en seguimiento cardiovascular." },
        { name: "ECG", why: "Control de evolución eléctrica cardíaca." },
      ],
      notes: ["Correlacionar con evolución clínica, adherencia y tratamiento actual."],
    },
    heart_failure: {
      summary:
        "Control de insuficiencia cardíaca con foco en función renal, balance electrolítico y marcadores de congestión.",
      tests: [
        { name: "Creatinina", why: "Seguimiento de función renal durante el control." },
        { name: "Electrolitos", why: "Monitoreo de sodio y potasio durante tratamiento." },
        { name: "NT-proBNP", why: "Apoyo al seguimiento de sobrecarga o congestión." },
        { name: "Hemograma", why: "Evaluación general y pesquisa de anemia asociada." },
      ],
      notes: ["El control debe correlacionarse con peso, síntomas y tratamiento diurético."],
    },
    atrial_fibrillation: {
      summary:
        "Control de fibrilación auricular con foco en anticoagulación, función renal y causas asociadas.",
      tests: [
        { name: "INR", why: "Seguimiento de anticoagulación en pacientes que lo requieran." },
        { name: "Función renal", why: "Ajuste y seguridad de tratamiento." },
        { name: "Electrolitos", why: "Monitoreo de factores que favorecen descompensación." },
        { name: "TSH", why: "Pesquisa de causas tiroideas asociadas." },
      ],
      notes: ["La periodicidad depende del tratamiento y del control clínico del ritmo."],
    },
    type2_diabetes: {
      summary: "Control de diabetes tipo 2 con seguimiento glicémico, renal y metabólico.",
      tests: [
        { name: "HbA1C", why: "Monitoreo del control glicémico periódico." },
        { name: "Perfil lipídico", why: "Seguimiento de riesgo cardiovascular asociado." },
        { name: "Creatinina / eGFR", why: "Evaluación de función renal." },
        { name: "Microalbuminuria", why: "Pesquisa temprana de compromiso renal." },
        { name: "B12", why: "Control útil en contexto de tratamiento prolongado y riesgo de déficit." },
      ],
      notes: ["La frecuencia del control depende de metas clínicas y tratamiento actual."],
    },
    obesity_metabolic_syndrome: {
      summary: "Control de obesidad o síndrome metabólico con evaluación cardiometabólica integral.",
      tests: [
        { name: "Perfil lipídico", why: "Seguimiento de riesgo cardiometabólico." },
        { name: "Glicemia / HbA1c", why: "Evaluación de alteraciones en metabolismo de glucosa." },
        { name: "PTGO", why: "Apoyo diagnóstico en evaluación metabólica según contexto." },
        { name: "TSH", why: "Pesquisa de alteraciones tiroideas asociadas." },
        { name: "Ácido úrico", why: "Evaluación metabólica complementaria." },
      ],
      notes: ["El control debe complementarse con seguimiento clínico, peso y estilo de vida."],
    },
    dyslipidemia: {
      summary: "Control de dislipidemia con seguimiento lipídico periódico.",
      tests: [
        { name: "Perfil lipídico", why: "Evaluación de colesterol total, LDL, HDL y triglicéridos." },
      ],
      notes: ["Correlacionar con tratamiento actual y riesgo cardiovascular global."],
    },
    hypothyroidism: {
      summary:
        "Control de hipotiroidismo con seguimiento de respuesta a tratamiento y ajuste de dosis si corresponde.",
      tests: [
        { name: "TSH", why: "Marcador principal para seguimiento de tratamiento." },
        { name: "T4 libre", why: "Complementa el control del eje tiroideo." },
      ],
      notes: ["La periodicidad depende del tiempo de tratamiento, síntomas y cambios de dosis."],
    },
    copd: {
      summary:
        "Control de EPOC con énfasis en seguimiento funcional respiratorio y evaluación hematológica.",
      tests: [
        { name: "Espirometría", why: "Seguimiento funcional respiratorio periódico." },
        { name: "Hemograma", why: "Evaluación si existe sospecha de policitemia o compromiso asociado." },
      ],
      notes: ["El seguimiento debe complementarse con evaluación clínica respiratoria."],
    },
    asthma: {
      summary: "Control de asma con seguimiento de función pulmonar.",
      tests: [{ name: "Espirometría", why: "Control funcional respiratorio en seguimiento de asma." }],
      notes: ["La indicación se ajusta a control clínico y respuesta a tratamiento."],
    },
    osteoporosis: {
      summary: "Control de osteoporosis con evaluación ósea, mineral y renal.",
      tests: [
        { name: "Densitometría", why: "Seguimiento de densidad mineral ósea." },
        { name: "Calcio total", why: "Evaluación de metabolismo mineral." },
        { name: "Vitamina D", why: "Control de suficiencia para manejo óseo." },
        { name: "Creatinina", why: "Monitoreo de función renal." },
      ],
      notes: ["La periodicidad depende de tratamiento y riesgo de fractura."],
    },
    rheumatoid_arthritis: {
      summary:
        "Control de artritis reumatoide con seguimiento inflamatorio, hematológico y hepático.",
      tests: [
        { name: "PCR", why: "Seguimiento de actividad inflamatoria." },
        { name: "VHS", why: "Apoyo al control de actividad inflamatoria." },
        { name: "Hemograma", why: "Monitoreo hematológico en seguimiento clínico." },
        { name: "Perfil hepático", why: "Control si existe tratamiento con fármacos que lo requieran." },
      ],
      notes: ["Correlacionar con actividad clínica, dolor y tratamiento actual."],
    },
    chronic_kidney_disease: {
      summary:
        "Control de enfermedad renal crónica con seguimiento renal, electrolítico y hematológico.",
      tests: [
        { name: "Creatinina / eGFR", why: "Seguimiento de función renal y progresión." },
        { name: "Electrolitos", why: "Monitoreo de balance electrolítico." },
        { name: "Microalbuminuria", why: "Evaluación de daño renal asociado." },
        { name: "Hemograma", why: "Pesquisa de anemia asociada a enfermedad renal." },
      ],
      notes: ["La frecuencia depende de etapa de enfermedad renal y tratamiento."],
    },
    chronic_liver_disease_masld: {
      summary:
        "Control de enfermedad hepática crónica (MASLD) con seguimiento bioquímico y por imágenes.",
      tests: [
        { name: "TGO/TGP", why: "Seguimiento de actividad hepática." },
        { name: "GGT", why: "Evaluación bioquímica hepática complementaria." },
        { name: "Perfil lipídico", why: "Seguimiento metabólico asociado." },
        { name: "Ecografía periódica", why: "Control estructural hepático según evolución." },
      ],
      notes: ["Ideal complementar con control metabólico y seguimiento clínico."],
    },
    chronic_hiv: {
      summary: "Control de VIH crónico con seguimiento virológico, inmunológico, renal y hepático.",
      tests: [
        { name: "Carga viral", why: "Monitoreo virológico del tratamiento." },
        { name: "CD4", why: "Seguimiento inmunológico." },
        { name: "Perfil hepático", why: "Control de seguridad y evolución clínica." },
        { name: "Creatinina", why: "Monitoreo de función renal." },
      ],
      notes: ["El seguimiento debe alinearse con control infectológico habitual."],
    },
  };

  const recommendation = baseMap[condition];

  if (!hasRecentChanges) return recommendation;

  return {
    summary: `${recommendation.summary} Se sugiere ampliar el control por cambios recientes en síntomas o tratamiento.`,
    tests: recommendation.tests,
    notes: [
      ...recommendation.notes,
      "Si hubo descompensación reciente, puede requerirse una evaluación clínica prioritaria.",
    ],
  };
}

export function recommendMultipleChronicControls(
  conditions: ChronicCondition[],
  hasRecentChanges: boolean,
  usesMedication: boolean,
  selectedMedications: MedicationOption[],
): ChronicControlRecommendation {
  const selected: ChronicCondition[] =
    conditions.length > 0 ? conditions : ["hypertension"];
  const recommendations = selected.map((condition) =>
    recommendChronicControl(condition, hasRecentChanges),
  );

  const summary =
    selected.length === 1
      ? recommendations[0].summary
      : `Control combinado para ${selected.map(conditionLabel).join(", ").toLowerCase()}, con un panel consolidado para seguimiento periódico.`;

  const testsMap = new Map<string, ControlTest>();
  for (const recommendation of recommendations) {
    for (const test of recommendation.tests) {
      if (!testsMap.has(test.name)) {
        testsMap.set(test.name, test);
      }
    }
  }

  if (usesMedication) {
    for (const medication of selectedMedications) {
      for (const test of MEDICATION_TESTS[medication]) {
        if (!testsMap.has(test.name)) {
          testsMap.set(test.name, test);
        }
      }
    }
  }

  const notes = Array.from(new Set(recommendations.flatMap((recommendation) => recommendation.notes)));
  if (usesMedication && selectedMedications.length > 0) {
    notes.push("Se agregaron exámenes complementarios según los tratamientos actualmente en uso.");
  }

  return {
    summary,
    tests: Array.from(testsMap.values()),
    notes,
  };
}

export function conditionLabel(condition: ChronicCondition) {
  switch (condition) {
    case "hypertension":
      return "Hipertensión arterial";
    case "ischemic_heart_disease":
      return "Cardiopatía isquémica";
    case "heart_failure":
      return "Insuficiencia cardíaca";
    case "atrial_fibrillation":
      return "Fibrilación auricular";
    case "type2_diabetes":
      return "Diabetes tipo 2";
    case "obesity_metabolic_syndrome":
      return "Obesidad / Síndrome metabólico";
    case "dyslipidemia":
      return "Dislipidemia";
    case "hypothyroidism":
      return "Hipotiroidismo";
    case "copd":
      return "EPOC";
    case "asthma":
      return "Asma";
    case "osteoporosis":
      return "Osteoporosis";
    case "rheumatoid_arthritis":
      return "Artritis reumatoide";
    case "chronic_kidney_disease":
      return "Enfermedad renal crónica";
    case "chronic_liver_disease_masld":
      return "Enfermedad hepática crónica (MASLD)";
    case "chronic_hiv":
      return "VIH crónico";
  }
}

export function medicationLabel(medication: MedicationOption) {
  switch (medication) {
    case "metformin":
      return "Metformina";
    case "corticosteroids":
      return "Corticoides (prednisona, hidrocortisona, etc)";
    case "lithium":
      return "Litio";
    case "antiepileptics":
      return "Antiepilépticos";
    case "immunosuppressants":
      return "Inmunosupresores (metotrexato, azatioprina, biológicos)";
    case "antidepressants":
      return "Antidepresivos";
    case "warfarin":
      return "Warfarina";
  }
}
