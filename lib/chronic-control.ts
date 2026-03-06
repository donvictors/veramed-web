import { recommend, type CheckupInput } from "@/lib/checkup";

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
  | "pulmonary_interstitial_disease"
  | "osteoporosis"
  | "rheumatoid_arthritis"
  | "lupus_erythematosus_systemic"
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
  | "amiodarone"
  | "antiepileptics"
  | "immunosuppressants"
  | "antidepressants"
  | "warfarin";

export type AntiepilepticOption =
  | "valproic_acid"
  | "carbamazepine"
  | "phenytoin"
  | "phenobarbital"
  | "other";

export type ChronicControlRecommendation = {
  summary: string;
  tests: ControlTest[];
  notes: string[];
  removedTests?: ControlTest[];
};

export type StoredChronicControl = {
  conditions: ChronicCondition[];
  patient?: import("./checkup").PatientDetails;
  yearsSinceDiagnosis: number;
  hasRecentChanges: boolean;
  usesMedication: boolean;
  selectedMedications: MedicationOption[];
  selectedAntiepileptics?: AntiepilepticOption[];
  includeGeneralCheckup?: boolean;
  generalCheckupInput?: CheckupInput;
  rec: ChronicControlRecommendation;
};

export const CHRONIC_CONTROL_PRICE_CLP = 3990;
export const CHRONIC_CONTROL_GENERAL_CHECKUP_ADDON_CLP = 1000;
export const CHRONIC_CONTROL_GENERAL_CHECKUP_NOTE =
  "Incluye módulo adicional de chequeo general (+$1.000).";

export const CONDITION_OPTIONS: ChronicCondition[] = [
  "hypertension",
  "type2_diabetes",
  "dyslipidemia",
  "obesity_metabolic_syndrome",
  "ischemic_heart_disease",
  "heart_failure",
  "atrial_fibrillation",
  "chronic_kidney_disease",
  "chronic_liver_disease_masld",
  "asthma",
  "copd",
  "pulmonary_interstitial_disease",
  "hypothyroidism",
  "osteoporosis",
  "rheumatoid_arthritis",
  "lupus_erythematosus_systemic",
];

export const MEDICATION_OPTIONS: MedicationOption[] = [
  "metformin",
  "corticosteroids",
  "lithium",
  "amiodarone",
  "antiepileptics",
  "immunosuppressants",
  "antidepressants",
  "warfarin",
];

export const ANTIEPILEPTIC_OPTIONS: AntiepilepticOption[] = [
  "valproic_acid",
  "carbamazepine",
  "phenytoin",
  "phenobarbital",
  "other",
];

const MEDICATION_TESTS: Record<MedicationOption, ControlTest[]> = {
  metformin: [
    {
      name: "Niveles de vitamina B12",
      why: "Seguimiento de déficit asociado a uso crónico de metformina.",
    },
  ],
  corticosteroids: [
    { name: "Densitometría ósea", why: "Control de riesgo óseo asociado a uso de corticoides." },
    { name: "Calcio total", why: "Seguimiento del metabolismo mineral." },
    { name: "Niveles de vitamina D", why: "Apoyo al control de salud ósea." },
    { name: "Glucosa en sangre", why: "Pesquisa de alteraciones glicémicas asociadas a corticoides." },
    { name: "Perfil lipídico", why: "Seguimiento metabólico por impacto de tratamiento." },
  ],
  lithium: [
    {
      name: "Niveles plasmáticos de litio",
      why: "Monitoreo terapéutico del tratamiento con litio.",
    },
    { name: "Creatinina en sangre", why: "Seguimiento de función renal durante el tratamiento." },
    { name: "TSH", why: "Control de función tiroidea asociado a uso de litio." },
    {
      name: "Electrolitos en sangre (Na, K, Cl)",
      why: "Monitoreo de equilibrio electrolítico.",
    },
    { name: "Calcio total", why: "Seguimiento de metabolismo mineral durante tratamiento con litio." },
  ],
  amiodarone: [
    {
      name: "TSH",
      why: "Control de función tiroidea en pacientes en tratamiento con amiodarona.",
    },
  ],
  antiepileptics: [
    { name: "Hemograma", why: "Seguimiento hematológico durante uso de antiepilépticos." },
    { name: "Perfil hepático", why: "Control de seguridad hepática del tratamiento." },
  ],
  immunosuppressants: [
    { name: "Hemograma", why: "Monitoreo hematológico durante tratamiento inmunosupresor." },
    { name: "Creatinina en sangre", why: "Seguimiento de función renal durante tratamiento inmunosupresor." },
    { name: "Perfil hepático", why: "Control de seguridad hepática del tratamiento." },
  ],
  antidepressants: [
    {
      name: "Electrolitos en sangre (Na, K, Cl)",
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
        { name: "Creatinina en sangre", why: "Seguimiento de función renal en hipertensión." },
        {
          name: "Electrolitos en sangre (Na, K, Cl)",
          why: "Monitoreo de efecto de tratamiento y balance electrolítico.",
        },
        { name: "Perfil lipídico", why: "Estratificación de riesgo cardiovascular." },
        { name: "Glucosa en sangre", why: "Evaluación metabólica y de riesgo cardiometabólico." },
        {
          name: "Razón albuminuria / creatininuria (RAC)",
          why: "Pesquisa precoz de daño renal asociado.",
        },
        { name: "Electrocardiograma (ECG)", why: "Evaluación cardiovascular basal o de seguimiento." },
      ],
      notes: [
        "Te sugerimos complementar estos exámenes con el autocontrol de tu presión arterial. Recuerda usar un dispositivo validado. Puedes usar esta hoja para guiarte en como hacer el registro.",
      ],
    },
    ischemic_heart_disease: {
      summary:
        "Control de cardiopatía isquémica o enfermedad coronaria crónica con foco cardiometabólico y de seguimiento cardiovascular.",
      tests: [
        { name: "Perfil lipídico", why: "Seguimiento de control lipídico secundario." },
        { name: "Glucosa en sangre", why: "Evaluación metabólica y de riesgo cardiometabólico." },
        { name: "Creatinina en sangre", why: "Monitoreo de función renal en seguimiento cardiovascular." },
        { name: "Electrocardiograma (ECG)", why: "Control de evolución eléctrica cardíaca." },
      ],
      notes: ["Correlacionar con evolución clínica, adherencia y tratamiento actual."],
    },
    heart_failure: {
      summary:
        "Control de insuficiencia cardíaca con foco en función renal, balance electrolítico y marcadores de congestión.",
      tests: [
        { name: "Creatinina en sangre", why: "Seguimiento de función renal durante el control." },
        {
          name: "Electrolitos en sangre (Na, K, Cl)",
          why: "Monitoreo de sodio y potasio durante tratamiento.",
        },
        { name: "Hemograma", why: "Evaluación general y pesquisa de anemia asociada." },
        { name: "Ferritina", why: "Evaluación de déficit de hierro en insuficiencia cardíaca." },
        { name: "Cinética de fierro", why: "Evaluación del metabolismo del hierro para seguimiento clínico." },
      ],
      notes: ["El control debe correlacionarse con peso, síntomas y tratamiento diurético."],
    },
    atrial_fibrillation: {
      summary:
        "Control de fibrilación auricular con foco en función renal, riesgo hematológico y seguridad de tratamiento.",
      tests: [
        { name: "Creatinina en sangre", why: "Ajuste y seguridad de tratamiento." },
        {
          name: "Electrolitos en sangre (Na, K, Cl)",
          why: "Monitoreo de factores que favorecen descompensación.",
        },
        { name: "Hemograma", why: "Seguimiento hematológico en contexto de fibrilación auricular." },
        { name: "Perfil hepático", why: "Control de seguridad del tratamiento según contexto clínico." },
      ],
      notes: ["La periodicidad depende del tratamiento y del control clínico del ritmo."],
    },
    type2_diabetes: {
      summary: "Control de diabetes tipo 2 con seguimiento glicémico, renal y metabólico.",
      tests: [
        { name: "Hemoglobina glicosilada (HbA1C)", why: "Monitoreo del control glicémico periódico." },
        { name: "Perfil lipídico", why: "Seguimiento de riesgo cardiovascular asociado." },
        { name: "Creatinina en sangre", why: "Evaluación de función renal." },
        {
          name: "Razón albuminuria / creatininuria (RAC)",
          why: "Pesquisa temprana de compromiso renal.",
        },
        { name: "Perfil hepático", why: "Seguimiento metabólico y hepático asociado." },
        {
          name: "Fondo de ojo",
          why: "Derivación para evaluación oftalmológica de control en diabetes tipo 2.",
        },
      ],
      notes: ["La frecuencia del control depende de metas clínicas y tratamiento actual."],
    },
    obesity_metabolic_syndrome: {
      summary: "Control de obesidad o síndrome metabólico con evaluación cardiometabólica integral.",
      tests: [
        { name: "Perfil lipídico", why: "Seguimiento de riesgo cardiometabólico." },
        { name: "Glucosa en sangre", why: "Evaluación de alteraciones en metabolismo de glucosa." },
        {
          name: "Hemoglobina glicosilada (HbA1C)",
          why: "Apoyo complementario para evaluación metabólica.",
        },
        { name: "Perfil hepático", why: "Seguimiento metabólico y hepático en contexto de riesgo cardiometabólico." },
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
        {
          name: "Espirometría basal y post broncodilatador",
          why: "Seguimiento funcional respiratorio periódico.",
        },
        { name: "Hemograma", why: "Evaluación si existe sospecha de policitemia o compromiso asociado." },
      ],
      notes: ["El seguimiento debe complementarse con evaluación clínica respiratoria."],
    },
    asthma: {
      summary: "Control de asma con seguimiento de función pulmonar.",
      tests: [
        {
          name: "Espirometría basal y post broncodilatador",
          why: "Control funcional respiratorio en seguimiento de asma.",
        },
      ],
      notes: ["La indicación se ajusta a control clínico y respuesta a tratamiento."],
    },
    pulmonary_interstitial_disease: {
      summary:
        "Control de enfermedad pulmonar intersticial con seguimiento funcional respiratorio y capacidad de difusión.",
      tests: [
        {
          name: "Espirometría basal y post broncodilatador",
          why: "Seguimiento funcional respiratorio periódico.",
        },
        {
          name: "Estudio de capacidad de difusion (DLCO)",
          why: "Evaluación de capacidad de difusión pulmonar en seguimiento intersticial.",
        },
        {
          name: "Test de caminata en 6 minutos",
          why: "Evaluación funcional de la capacidad de ejercicio.",
        },
      ],
      notes: ["El seguimiento debe complementarse con evaluación clínica respiratoria especializada."],
    },
    osteoporosis: {
      summary: "Control de osteoporosis con evaluación ósea, mineral y renal.",
      tests: [
        { name: "Densitometría ósea", why: "Seguimiento de densidad mineral ósea." },
        { name: "Calcio total", why: "Evaluación de metabolismo mineral." },
        { name: "Niveles de vitamina D", why: "Control de suficiencia para manejo óseo." },
        { name: "Creatinina en sangre", why: "Monitoreo de función renal." },
      ],
      notes: ["La periodicidad depende de tratamiento y riesgo de fractura."],
    },
    rheumatoid_arthritis: {
      summary:
        "Control de artritis reumatoide con seguimiento inflamatorio y hematológico.",
      tests: [
        { name: "Hemograma", why: "Monitoreo hematológico en seguimiento clínico." },
        { name: "Proteína C reactiva (PCR)", why: "Seguimiento de actividad inflamatoria." },
      ],
      notes: ["Correlacionar con actividad clínica, dolor y tratamiento actual."],
    },
    lupus_erythematosus_systemic: {
      summary:
        "Control de lupus eritematoso sistémico con seguimiento hematológico, inflamatorio, renal e inmunológico.",
      tests: [
        { name: "Hemograma", why: "Monitoreo hematológico en seguimiento de lupus." },
        { name: "Proteína C reactiva (PCR)", why: "Seguimiento de actividad inflamatoria." },
        { name: "Creatinina en sangre", why: "Seguimiento de función renal en control de lupus." },
        { name: "Orina completa", why: "Pesquisa de compromiso urinario asociado a lupus." },
        {
          name: "Razón proteinuria / creatininuria (IPC)",
          why: "Evaluación de proteinuria en muestra de orina.",
        },
        {
          name: "Cuantificación de complemento C3",
          why: "Seguimiento inmunológico del consumo de complemento.",
        },
        {
          name: "Cuantificación de complemento C4",
          why: "Seguimiento inmunológico del consumo de complemento.",
        },
        {
          name: "Anticuerpos anti-DNA por ELISA",
          why: "Seguimiento de actividad inmunológica asociada a lupus.",
        },
      ],
      notes: ["Correlacionar con actividad clínica y seguimiento por equipo tratante."],
    },
    chronic_kidney_disease: {
      summary:
        "Control de enfermedad renal crónica con seguimiento renal, electrolítico, metabólico y hematológico.",
      tests: [
        { name: "Creatinina en sangre", why: "Seguimiento de función renal y progresión." },
        {
          name: "Electrolitos en sangre (Na, K, Cl)",
          why: "Monitoreo de balance electrolítico.",
        },
        { name: "Gases en sangre venosa", why: "Evaluación de equilibrio ácido-base en enfermedad renal crónica." },
        {
          name: "Razón albuminuria / creatininuria (RAC)",
          why: "Evaluación de daño renal asociado.",
        },
        { name: "Hemograma", why: "Pesquisa de anemia asociada a enfermedad renal." },
        { name: "Perfil bioquímico", why: "Seguimiento bioquímico general en control renal crónico." },
        { name: "PTH", why: "Evaluación del metabolismo óseo-mineral en enfermedad renal crónica." },
        { name: "Niveles de vitamina D", why: "Control de suficiencia de vitamina D en contexto renal crónico." },
      ],
      notes: ["La frecuencia depende de etapa de enfermedad renal y tratamiento."],
    },
    chronic_liver_disease_masld: {
      summary:
        "Control de enfermedad hepática crónica con seguimiento clínico, bioquímico y por imágenes.",
      tests: [
        { name: "Perfil hepático", why: "Seguimiento bioquímico hepático periódico." },
        { name: "Albúmina", why: "Evaluación de función sintética hepática." },
        { name: "Hemograma", why: "Monitoreo hematológico en contexto de hepatopatía crónica." },
        { name: "Creatinina en sangre", why: "Seguimiento de función renal en control hepático crónico." },
        { name: "Electrolitos en sangre (Na, K, Cl)", why: "Evaluación de balance electrolítico asociado." },
        { name: "Ecografía abdominal", why: "Seguimiento por imágenes en hepatopatía crónica." },
        { name: "Alfa-fetoproteína (AFP)", why: "Apoyo al seguimiento oncológico en contexto de riesgo hepático." },
      ],
      notes: ["Ideal complementar con seguimiento clínico por equipo tratante."],
    },
    chronic_hiv: {
      summary: "Control de VIH crónico con seguimiento virológico, inmunológico, renal y hepático.",
      tests: [
        { name: "Carga viral VIH", why: "Monitoreo virológico del tratamiento." },
        {
          name: "Cuantificación de subpoblaciones de linfocitos T (CD3, CD4, CD8)",
          why: "Seguimiento inmunológico.",
        },
        { name: "Perfil hepático", why: "Control de seguridad y evolución clínica." },
        { name: "Creatinina en sangre", why: "Monitoreo de función renal." },
      ],
      notes: ["El seguimiento debe alinearse con control infectológico habitual."],
    },
  };

  const recommendation = baseMap[condition];
  const tests = [...recommendation.tests];
  const notes = [...recommendation.notes];

  if (hasRecentChanges) {
    if (condition === "heart_failure") {
      tests.push({
        name: "NT-proBNP",
        why: "Se agrega por cambios recientes en síntomas o tratamiento para apoyar evaluación de congestión.",
      });
    }
    if (condition === "asthma") {
      tests.push({
        name: "Test de caminata en 6 minutos",
        why: "Se agrega por cambios recientes en síntomas o tratamiento para evaluar capacidad funcional.",
      });
    }
    if (condition === "copd") {
      tests.push({
        name: "Gases en sangre arterial",
        why: "Se agrega por cambios recientes en síntomas o tratamiento para evaluar intercambio gaseoso.",
      });
      tests.push({
        name: "Test de caminata en 6 minutos",
        why: "Se agrega por cambios recientes en síntomas o tratamiento para evaluar capacidad funcional.",
      });
    }
    if (condition === "pulmonary_interstitial_disease") {
      tests.push({
        name: "Gases en sangre arterial",
        why: "Se agrega por cambios recientes en síntomas o tratamiento para evaluar intercambio gaseoso.",
      });
    }
    notes.push("Si hubo descompensación reciente, puede requerirse una evaluación clínica prioritaria.");
  }

  return {
    summary: hasRecentChanges
      ? `${recommendation.summary} Se sugiere ampliar el control por cambios recientes en síntomas o tratamiento.`
      : recommendation.summary,
    tests,
    notes,
  };
}

export function recommendMultipleChronicControls(
  conditions: ChronicCondition[],
  hasRecentChanges: boolean,
  usesMedication: boolean,
  selectedMedications: MedicationOption[],
  selectedAntiepileptics: AntiepilepticOption[] = [],
  generalCheckupInput?: CheckupInput,
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

  const selectedSet = new Set(selected);
  const medicationSet = new Set(selectedMedications);
  const hasRaRelatedTreatment =
    medicationSet.has("immunosuppressants") || medicationSet.has("corticosteroids");

  if (selectedSet.has("rheumatoid_arthritis") && hasRaRelatedTreatment) {
    if (!testsMap.has("Creatinina en sangre")) {
      testsMap.set("Creatinina en sangre", {
        name: "Creatinina en sangre",
        why: "Se agrega por uso de inmunosupresores o corticoides en artritis reumatoide.",
      });
    }
    if (!testsMap.has("Perfil hepático")) {
      testsMap.set("Perfil hepático", {
        name: "Perfil hepático",
        why: "Se agrega por uso de inmunosupresores o corticoides en artritis reumatoide.",
      });
    }
  }

  if (medicationSet.has("antiepileptics")) {
    const antiepilepticSet = new Set(selectedAntiepileptics);

    if (antiepilepticSet.has("valproic_acid")) {
      testsMap.set("Niveles plasmáticos de ácido valproico", {
        name: "Niveles plasmáticos de ácido valproico",
        why: "Monitoreo terapéutico en pacientes en uso de ácido valproico.",
      });
    }

    if (antiepilepticSet.has("carbamazepine")) {
      testsMap.set("Niveles plasmáticos de carbamazepina", {
        name: "Niveles plasmáticos de carbamazepina",
        why: "Monitoreo terapéutico en pacientes en uso de carbamazepina.",
      });
    }

    if (antiepilepticSet.has("phenytoin")) {
      testsMap.set("Niveles plasmáticos de fenitoina", {
        name: "Niveles plasmáticos de fenitoina",
        why: "Monitoreo terapéutico en pacientes en uso de fenitoina.",
      });
    }

    if (antiepilepticSet.has("phenobarbital")) {
      testsMap.set("Niveles plasmáticos de fenobarbital", {
        name: "Niveles plasmáticos de fenobarbital",
        why: "Monitoreo terapéutico en pacientes en uso de fenobarbital.",
      });
    }

    if (antiepilepticSet.has("other")) {
      testsMap.set("Niveles plasmáticos de antiepiléptico (según fármaco en uso)", {
        name: "Niveles plasmáticos de antiepiléptico (según fármaco en uso)",
        why: "Monitoreo terapéutico de antiepilépticos según indicación clínica.",
      });
    }
  }

  if (generalCheckupInput) {
    const generalCheckupRecommendation = recommend(generalCheckupInput);
    for (const test of generalCheckupRecommendation.tests) {
      const existing = testsMap.get(test.name);
      if (!existing) {
        testsMap.set(test.name, { ...test });
        continue;
      }

      if (!existing.why.includes(test.why)) {
        existing.why = `${existing.why} ${test.why}`;
      }
    }
  }

  const notes = Array.from(new Set(recommendations.flatMap((recommendation) => recommendation.notes)));
  if (usesMedication && selectedMedications.length > 0) {
    notes.push("Se agregaron exámenes complementarios según los tratamientos actualmente en uso.");
  }
  if (generalCheckupInput) {
    notes.push(CHRONIC_CONTROL_GENERAL_CHECKUP_NOTE);
  }

  return {
    summary,
    tests: Array.from(testsMap.values()),
    notes,
  };
}

export function hasGeneralCheckupAddon(rec: ChronicControlRecommendation) {
  return rec.notes.includes(CHRONIC_CONTROL_GENERAL_CHECKUP_NOTE);
}

export function getChronicControlTotalPrice(rec: ChronicControlRecommendation) {
  return (
    CHRONIC_CONTROL_PRICE_CLP +
    (hasGeneralCheckupAddon(rec) ? CHRONIC_CONTROL_GENERAL_CHECKUP_ADDON_CLP : 0)
  );
}

export function conditionLabel(condition: ChronicCondition) {
  switch (condition) {
    case "hypertension":
      return "Hipertensión arterial";
    case "ischemic_heart_disease":
      return "Cardiopatía isquémica / enfermedad coronaria crónica";
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
    case "pulmonary_interstitial_disease":
      return "Enfermedad pulmonar intersticial";
    case "osteoporosis":
      return "Osteoporosis";
    case "rheumatoid_arthritis":
      return "Artritis reumatoide";
    case "lupus_erythematosus_systemic":
      return "Lupus eritematoso sistémico";
    case "chronic_kidney_disease":
      return "Enfermedad renal crónica";
    case "chronic_liver_disease_masld":
      return "Enfermedad hepática crónica";
    case "chronic_hiv":
      return "VIH crónico";
  }
}

export function medicationLabel(medication: MedicationOption) {
  switch (medication) {
    case "metformin":
      return "Metformina";
    case "corticosteroids":
      return "Corticoides";
    case "lithium":
      return "Litio";
    case "amiodarone":
      return "Amiodarona";
    case "antiepileptics":
      return "Antiepilépticos";
    case "immunosuppressants":
      return "Inmunosupresores";
    case "antidepressants":
      return "Antidepresivos";
    case "warfarin":
      return "Warfarina";
  }
}

export function antiepilepticLabel(option: AntiepilepticOption) {
  switch (option) {
    case "valproic_acid":
      return "Acido valproico";
    case "carbamazepine":
      return "Carbamazepina";
    case "phenytoin":
      return "Fenitoina";
    case "phenobarbital":
      return "Fenobarbital";
    case "other":
      return "Otro antiepiléptico";
  }
}
