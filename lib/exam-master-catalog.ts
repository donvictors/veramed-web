export type ExamOrderCategory =
  | "laboratory"
  | "image"
  | "procedure"
  | "interconsultation";

export type ExamSampleType =
  | "Sangre"
  | "Orina"
  | "Deposiciones"
  | "Hisopado endocervical"
  | "Orina 2da micción muestra aislada"
  | "Secreción endocervical / orina de primer chorro / secreción vaginal"
  | "Según sitio indicado: orina de primer chorro / secreción endocervical o vaginal / hisopado rectal (confirmar disponibilidad con laboratorio)";

export type ExamMasterCatalogItem = {
  name: string;
  category: ExamOrderCategory;
  fonasaCode: string;
  sampleType?: ExamSampleType;
  orderObservation?: string;
  requiresFasting?: boolean;
  aliases?: string[];
};

export type ImagingContrastOption = "with_contrast" | "without_contrast";

export const EXAM_MASTER_CATALOG: readonly ExamMasterCatalogItem[] = [
  { name: "Ácido úrico", category: "laboratory", fonasaCode: "0302005" },
  { name: "Albúmina", category: "laboratory", fonasaCode: "0302101" },
  { name: "Alfa-fetoproteína (AFP)", category: "laboratory", fonasaCode: "0305003" },
  {
    name: "Aldosterona o aldosterona sérica",
    category: "laboratory",
    fonasaCode: "0303002",
    requiresFasting: true,
    orderObservation:
      "Requiere ayuno de 8 horas. Mantener consumo habitual de sal, salvo indicación médica distinta. Evitar alcohol durante las 24 horas previas. Tomar la muestra antes de las 10:00 AM y permanecer sentado durante 15 minutos antes de la punción.",
    aliases: ["Aldosterona", "Aldosterona sérica"],
  },
  {
    name: "ANCA o anticuerpos anti-citoplasma de neutrófilos por inmunofluorescencia indirecta",
    category: "laboratory",
    fonasaCode: "0305082",
    orderObservation: "No requiere preparación.",
    aliases: ["ANCA"],
  },
  {
    name: "Anticuerpos anti-células parietales y anti-factor intrínseco por ELISA",
    category: "laboratory",
    fonasaCode: "0305007, 0305007",
    orderObservation: "No requiere preparación.",
    aliases: ["Anti-células parietales y anti-factor intrínseco por ELISA"],
  },
  { name: "Anticuerpos anti Virus Hepatitis C", category: "laboratory", fonasaCode: "0306081" },
  { name: "Anticuerpos anti-DNA por ELISA", category: "laboratory", fonasaCode: "0305005" },
  {
    name: "Anticuerpos anti-mitocondriales (AMA) por inmunofluorescencia indirecta",
    category: "laboratory",
    fonasaCode: "0305005",
    orderObservation: "No requiere preparación.",
    aliases: ["AMA"],
  },
  {
    name: "Anticuerpos anti-músculo liso (ASMA)",
    category: "laboratory",
    fonasaCode: "0305005",
    orderObservation: "No requiere preparación.",
    aliases: ["ASMA"],
  },
  {
    name: "Anticuerpos antinucleares (ANA) por inmunofluorescencia indirecta",
    category: "laboratory",
    fonasaCode: "0305005",
    orderObservation: "No requiere preparación.",
    aliases: ["ANA"],
  },
  {
    name: "Antígeno de superficie Virus Hepatitis B (HBsAg)",
    category: "laboratory",
    fonasaCode: "0306079",
  },
  {
    name: "Antígeno de Helicobacter pylori en deposiciones",
    category: "laboratory",
    fonasaCode: "0308063",
    sampleType: "Deposiciones",
    orderObservation: "Requiere muestra de deposiciones según indicación del laboratorio.",
  },
  { name: "Antígeno prostático específico (APE)", category: "laboratory", fonasaCode: "0305070" },
  { name: "Anticuerpo anti-CCP", category: "laboratory", fonasaCode: "0305099" },
  { name: "Antígeno influenza A y B", category: "laboratory", fonasaCode: "0306070", orderObservation: "No requiere preparación." },
  { name: "Calcio total", category: "laboratory", fonasaCode: "0302015" },
  {
    name: "Calprotectina fecal cuantitativa",
    category: "laboratory",
    fonasaCode: "0308049",
    sampleType: "Deposiciones",
    orderObservation: "Requiere muestra de deposiciones según indicación del laboratorio.",
    aliases: ["Calprotectina fecal", "Calprotectina cuantitativa por ELISA"],
  },
  { name: "Carga viral VIH", category: "laboratory", fonasaCode: "0306086" },
  {
    name: "Cinética de fierro",
    category: "laboratory",
    fonasaCode: "0301030",
    requiresFasting: true,
    orderObservation:
      "Requiere ayuno de 8 horas. Idealmente realizar la toma durante la mañana, antes del mediodía.",
  },
  { name: "Colonoscopía total", category: "procedure", fonasaCode: "1801006" },
  {
    name: "Coprocultivo",
    category: "laboratory",
    fonasaCode: "0306007",
    sampleType: "Deposiciones",
    orderObservation: "Requiere muestra de deposiciones según indicación del laboratorio.",
  },
  { name: "Cotesting (PAP+VPH)", category: "procedure", fonasaCode: "No informado" },
  { name: "Creatinina en sangre", category: "laboratory", fonasaCode: "0302023" },
  {
    name: "Creatinquinasa total (CK total)",
    category: "laboratory",
    fonasaCode: "0302026",
    orderObservation: "No requiere preparación.",
    aliases: ["CK total", "Creatina quinasa"],
  },
  {
    name: "Cuantificación de complemento C3",
    category: "laboratory",
    fonasaCode: "0305012",
    requiresFasting: false,
    orderObservation: "Ayuno de 6 horas recomendable.",
  },
  {
    name: "Cuantificación de complemento C4",
    category: "laboratory",
    fonasaCode: "0305012",
    requiresFasting: false,
    orderObservation: "Ayuno de 6 horas recomendable.",
  },
  {
    name: "Cuantificación de subpoblaciones de linfocitos T (CD3, CD4, CD8)",
    category: "laboratory",
    fonasaCode: "0305091",
  },
  {
    name: "Cortisol sérico",
    category: "laboratory",
    fonasaCode: "0303006",
    requiresFasting: true,
    orderObservation:
      "Requiere ayuno de 10–12 horas. Agua permitida. Requiere reposo de al menos 30 minutos antes de la toma y debe recolectarse antes de las 09:00 AM.",
    aliases: ["Cortisol basal"],
  },
  {
    name: "Cortisol sérico post dexametasona",
    category: "laboratory",
    fonasaCode: "0303006",
    orderObservation:
      "Requiere coordinación e indicaciones específicas según protocolo del test de supresión con dexametasona.",
    aliases: ["Test de Nugent", "Test de supresión con dexametasona"],
  },
  { name: "Densitometría ósea", category: "image", fonasaCode: "0501134" },
  {
    name: "Deshidrogenasa láctica (LDH)",
    category: "laboratory",
    fonasaCode: "0302030",
    orderObservation: "No requiere preparación.",
    aliases: ["LDH"],
  },
  { name: "Dímero D", category: "laboratory", fonasaCode: "0301095", orderObservation: "No requiere preparación." },
  { name: "Ecografía abdominal", category: "image", fonasaCode: "0404003" },
  { name: "Ecografía mamaria", category: "image", fonasaCode: "0404012" },
  {
    name: "Ecocardiograma Doppler color",
    category: "procedure",
    fonasaCode: "1701045",
    aliases: ["Ecocardiograma transtorácico"],
  },
  { name: "Electrocardiograma (ECG)", category: "procedure", fonasaCode: "1701001" },
  { name: "Electrolitos en sangre (Na, K, Cl)", category: "laboratory", fonasaCode: "0302032" },
  { name: "ELISA para VIH", category: "laboratory", fonasaCode: "0306169" },
  {
    name: "Endoscopía digestiva alta",
    category: "procedure",
    fonasaCode: "1801001",
    aliases: ["EDA"],
  },
  {
    name: "Espirometría basal y post broncodilatador",
    category: "procedure",
    fonasaCode: "1707002",
  },
  {
    name: "Estudio de capacidad de difusion (DLCO)",
    category: "procedure",
    fonasaCode: "1707008",
  },
  {
    name: "Factor reumatoide (FR)",
    category: "laboratory",
    fonasaCode: "0305020",
    requiresFasting: false,
    orderObservation: "Preferentemente realizar en ayunas.",
  },
  { name: "Ferritina", category: "laboratory", fonasaCode: "0301026" },
  {
    name: "Folato sérico",
    category: "laboratory",
    fonasaCode: "0301002",
    requiresFasting: true,
    orderObservation: "Requiere ayuno de 8 horas.",
  },
  { name: "Fondo de ojo", category: "interconsultation", fonasaCode: "0101204" },
  {
    name: "Fósforo en sangre",
    category: "laboratory",
    fonasaCode: "0302042",
    requiresFasting: true,
    orderObservation: "Requiere ayuno de 8 horas.",
  },
  {
    name: "FSH (Hormona folículo estimulante)",
    category: "laboratory",
    fonasaCode: "0303015",
    orderObservation: "No requiere preparación.",
    aliases: ["FSH"],
  },
  { name: "Gases en sangre arterial", category: "laboratory", fonasaCode: "0302046" },
  { name: "Gases en sangre venosa", category: "laboratory", fonasaCode: "0302046" },
  {
    name: "Glucosa en sangre",
    category: "laboratory",
    fonasaCode: "0302047",
    requiresFasting: true,
    orderObservation: "Requiere ayuno mínimo de 8 horas. Se puede beber agua.",
  },
  {
    name: "Hemoglobina glicosilada (HbA1C)",
    category: "laboratory",
    fonasaCode: "0301041",
    requiresFasting: false,
    orderObservation: "No requiere ayuno. No requiere preparación especial.",
  },
  { name: "Hemograma", category: "laboratory", fonasaCode: "0301045" },
  {
    name: "Holter de arritmias 24 h",
    category: "procedure",
    fonasaCode: "1701006",
    aliases: ["Holter de ritmo", "Holter cardíaco"],
  },
  {
    name: "Holter de presión arterial (MAPA)",
    category: "procedure",
    fonasaCode: "1701009",
  },
  { name: "INR", category: "laboratory", fonasaCode: "0301059" },
  {
    name: "Tiempo de protrombina (TP/INR)",
    category: "laboratory",
    fonasaCode: "0301059",
    requiresFasting: false,
    orderObservation: "Ayuno de 4 horas recomendable.",
  },
  {
    name: "LH (Hormona luteinizante)",
    category: "laboratory",
    fonasaCode: "0303016",
    orderObservation: "No requiere preparación.",
    aliases: ["LH"],
  },
  { name: "Lipasa", category: "laboratory", fonasaCode: "0302053" },
  {
    name: "Magnesio en sangre",
    category: "laboratory",
    fonasaCode: "0302056",
    orderObservation: "No requiere preparación.",
    aliases: ["Mg en sangre", "Magnesio sérico"],
  },
  {
    name: "Mamografía bilateral",
    category: "image",
    fonasaCode: "0401010",
    aliases: ["Tamizaje de cáncer de mama"],
  },
  {
    name: "Niveles de vitamina B12",
    category: "laboratory",
    fonasaCode: "0302077",
    requiresFasting: true,
    orderObservation: "Requiere ayuno de 8 horas.",
  },
  { name: "Niveles de vitamina D", category: "laboratory", fonasaCode: "0302078" },
  { name: "Niveles plasmáticos de ácido valproico", category: "laboratory", fonasaCode: "0302035" },
  {
    name: "Niveles plasmáticos de antiepiléptico (según fármaco en uso)",
    category: "laboratory",
    fonasaCode: "0302035",
  },
  { name: "Niveles plasmáticos de carbamazepina", category: "laboratory", fonasaCode: "0302035" },
  { name: "Niveles plasmáticos de fenitoina", category: "laboratory", fonasaCode: "0302035" },
  { name: "Niveles plasmáticos de fenobarbital", category: "laboratory", fonasaCode: "0302035" },
  { name: "Niveles plasmáticos de litio", category: "laboratory", fonasaCode: "0302035" },
  {
    name: "Nitrógeno ureico en sangre (BUN)",
    category: "laboratory",
    fonasaCode: "0302057",
    orderObservation: "No requiere preparación.",
    aliases: ["BUN", "Nitrógeno ureico"],
  },
  { name: "NT-proBNP", category: "laboratory", fonasaCode: "0303055" },
  { name: "Orina completa", category: "laboratory", fonasaCode: "0309022", sampleType: "Orina" },
  {
    name: "Papanicolau (PAP)",
    category: "procedure",
    fonasaCode: "0801001",
    aliases: ["Papanicolau"],
  },
  {
    name: "PCR Chlamydia trachomatis y Neisseria gonorrhoeae",
    category: "laboratory",
    fonasaCode: "0306097",
    orderObservation: "La muestra debe obtenerse del sitio anatómico indicado en esta orden. Para proctitis se requiere hisopado rectal; la orina no lo sustituye. Confirmar toma disponible con el laboratorio.",
    sampleType: "Según sitio indicado: orina de primer chorro / secreción endocervical o vaginal / hisopado rectal (confirmar disponibilidad con laboratorio)",
  },
  {
    name: "PCR de virus papiloma humano (VPH)",
    category: "procedure",
    fonasaCode: "0306123",
    sampleType: "Hisopado endocervical",
    aliases: ["Test de VPH (HPV)"],
  },
  {
    name: "Perfil bioquímico",
    category: "laboratory",
    fonasaCode: "0302075",
    requiresFasting: true,
    orderObservation: "Requiere ayuno mínimo de 8 horas. Agua permitida.",
  },
  {
    name: "Perfil hepático",
    category: "laboratory",
    fonasaCode: "0302076",
    requiresFasting: false,
    orderObservation: "Ayuno de 4 horas recomendable.",
  },
  {
    name: "Perfil lipídico",
    category: "laboratory",
    fonasaCode: "0302034",
    requiresFasting: true,
    orderObservation: "Requiere ayuno de 8 horas. Evitar alcohol durante las 24 horas previas.",
  },
  {
    name: "Prolactina",
    category: "laboratory",
    fonasaCode: "0303020",
    requiresFasting: true,
    orderObservation:
      "Requiere ayuno de 8 horas y reposo de 30 minutos previo a la toma de muestra. Ideal realizar entre 08:00 y 10:00 AM.",
  },
  { name: "Proteína C reactiva (PCR)", category: "laboratory", fonasaCode: "0305031" },
  {
    name: "Prueba de tolerancia a la glucosa oral (PTGO)",
    category: "laboratory",
    fonasaCode: "0302048",
    requiresFasting: true,
    orderObservation:
      "Requiere ayuno de 8 horas. Durante el examen debe permanecer en reposo, no fumar y no ingerir alimentos.",
  },
  {
    name: "PTH",
    category: "laboratory",
    fonasaCode: "0303018",
    requiresFasting: true,
    orderObservation: "Requiere ayuno de 8 horas. Agua permitida.",
  },
  {
    name: "Radiografía de tórax PA/L",
    category: "image",
    fonasaCode: "0401070",
    aliases: ["Radiografía de tórax"],
  },
  {
    name: "Razón albuminuria / creatininuria (RAC)",
    category: "laboratory",
    fonasaCode: "0308051, 0309010",
    sampleType: "Orina 2da micción muestra aislada",
    aliases: ["Razón albuminuria / creatininuria (RAC) en orina aislada"],
  },
  {
    name: "Razón proteinuria / creatininuria (IPC)",
    category: "laboratory",
    fonasaCode: "0309028, 0309010",
    sampleType: "Orina",
  },
  {
    name: "Recuento de reticulocitos",
    category: "laboratory",
    fonasaCode: "0301068",
    orderObservation: "No requiere preparación.",
    aliases: ["Reticulocitos"],
  },
  {
    name: "RM de cerebro",
    category: "image",
    fonasaCode: "0405001",
    aliases: ["Resonancia magnética cerebral"],
  },
  { name: "RPR/VDRL", category: "laboratory", fonasaCode: "0306038, 0306042" },
  { name: "T4 libre", category: "laboratory", fonasaCode: "0303026" },
  { name: "T3", category: "laboratory", fonasaCode: "0303028" },
  { name: "Tamizaje de cáncer cervicouterino", category: "procedure", fonasaCode: "No informado" },
  { name: "Tamizaje de cáncer colorrectal", category: "procedure", fonasaCode: "No informado" },
  {
    name: "TC de tórax de baja dosis",
    category: "image",
    fonasaCode: "0403013",
    orderObservation: "Protocolo de baja dosis",
  },
  { name: "TC de cerebro", category: "image", fonasaCode: "0403001", aliases: ["TAC cerebro"] },
  {
    name: "TC de tórax, abdomen y pelvis",
    category: "image",
    fonasaCode: "0403013/0403020",
    aliases: ["TAC TAP"],
  },
  { name: "TC de tórax", category: "image", fonasaCode: "0403013", aliases: ["TAC tórax"] },
  {
    name: "TC de abdomen y pelvis",
    category: "image",
    fonasaCode: "0403020",
    aliases: ["TAC abdomen y pelvis"],
  },
  { name: "Test de caminata en 6 minutos", category: "procedure", fonasaCode: "1707009" },
  {
    name: "Test de embarazo en sangre (hCG)",
    category: "laboratory",
    fonasaCode: "0303014",
    aliases: ["Test de embarazo (hCG)"],
  },
  {
    name: "Test inmunológico de sangre oculta en deposiciones",
    category: "laboratory",
    fonasaCode: "0308062",
    sampleType: "Deposiciones",
    orderObservation: "Requiere muestra de deposiciones según indicación del laboratorio.",
  },
  {
    name: "Testosterona total",
    category: "laboratory",
    fonasaCode: "0303022",
    requiresFasting: false,
    orderObservation:
      "No requiere ayuno. Ideal recolectar antes de las 11:00 AM. Si utiliza terapia hormonal tópica con testosterona, aplicar el gel después de la toma de muestra y evitar contaminación de la zona de punción.",
  },
  {
    name: "Tiempo de tromboplastina parcial activado (TTPA)",
    category: "laboratory",
    fonasaCode: "0301085",
    requiresFasting: false,
    orderObservation: "Ayuno de 4 horas recomendable.",
    aliases: ["TTPA"],
  },
  { name: "TSH", category: "laboratory", fonasaCode: "0303024" },
  { name: "Urocultivo", category: "laboratory", fonasaCode: "0306011", sampleType: "Orina" },
  {
    name: "Velocidad de eritrosedimentación (VHS/ESR)",
    category: "laboratory",
    fonasaCode: "0301086",
  },
] as const;

export const SYMPTOMS_CLINICAL_EXAM_ID_TO_MASTER_NAME: Record<string, string> = {
  cbc: "Hemograma",
  crp: "Proteína C reactiva (PCR)",
  esr: "Velocidad de eritrosedimentación (VHS/ESR)",
  creatinine: "Creatinina en sangre",
  electrolytes: "Electrolitos en sangre (Na, K, Cl)",
  bmp_or_basic_metabolic_panel: "Perfil bioquímico",
  liver_panel: "Perfil hepático",
  lipase: "Lipasa",
  glucose: "Glucosa en sangre",
  urinalysis: "Orina completa",
  urine_culture: "Urocultivo",
  pregnancy_test: "Test de embarazo en sangre (hCG)",
  chest_xray: "Radiografía de tórax PA/L",
  ecg: "Electrocardiograma (ECG)",
  stool_culture: "Coprocultivo",
  h_pylori_stool_antigen: "Antígeno de Helicobacter pylori en deposiciones",
  sti_naat: "PCR Chlamydia trachomatis y Neisseria gonorrhoeae",
  vaginal_naat: "PCR Chlamydia trachomatis y Neisseria gonorrhoeae",
  rf: "Factor reumatoide (FR)",
  anti_ccp: "Anticuerpo anti-CCP",
};

function normalizeExamName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripImagingContrastSuffix(value: string) {
  return value.replace(/\s+(?:con|sin) contraste$/i, "").trim();
}

function isContrastConfigurableMetadata(exam: ExamMasterCatalogItem | undefined) {
  return Boolean(exam && exam.category === "image" && /^(?:TC|RM)\b/i.test(exam.name));
}

const EXAM_MASTER_BY_NORMALIZED_NAME = new Map<string, ExamMasterCatalogItem>();

for (const exam of EXAM_MASTER_CATALOG) {
  EXAM_MASTER_BY_NORMALIZED_NAME.set(normalizeExamName(exam.name), exam);
  for (const alias of exam.aliases ?? []) {
    EXAM_MASTER_BY_NORMALIZED_NAME.set(normalizeExamName(alias), exam);
  }
}

export function getExamCatalog() {
  return EXAM_MASTER_CATALOG;
}

const COTESTING_NAME = "Cotesting (PAP+VPH)";
const PAP_NAME = "Papanicolau (PAP)";
const HPV_NAME = "PCR de virus papiloma humano (VPH)";

/**
 * Converts internal composite/legacy exam concepts into the individual lines
 * that must appear on a patient-facing medical order.
 */
export function expandExamItemsForOrder<T extends { name: string }>(items: readonly T[]): T[] {
  const expanded = items.flatMap((item) => {
    if (item.name === COTESTING_NAME) {
      return [
        { ...item, name: PAP_NAME },
        { ...item, name: HPV_NAME },
      ];
    }
    if (item.name === "Papanicolau") return [{ ...item, name: PAP_NAME }];
    if (item.name === "Test de VPH (HPV)") return [{ ...item, name: HPV_NAME }];
    if (item.name === "Test de embarazo (hCG)") {
      return [{ ...item, name: "Test de embarazo en sangre (hCG)" }];
    }
    if (item.name === "Radiografía de tórax") {
      return [{ ...item, name: "Radiografía de tórax PA/L" }];
    }
    return [item];
  });

  const seenNames = new Set<string>();
  return expanded.filter((item) => {
    const key = normalizeExamName(item.name);
    if (seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  });
}

export function getExamMetadataByName(examName: string) {
  const exact = EXAM_MASTER_BY_NORMALIZED_NAME.get(normalizeExamName(examName));
  if (exact) return exact;

  const base = EXAM_MASTER_BY_NORMALIZED_NAME.get(
    normalizeExamName(stripImagingContrastSuffix(examName)),
  );
  return isContrastConfigurableMetadata(base) ? base : undefined;
}

export function isContrastConfigurableExam(examName: string) {
  return isContrastConfigurableMetadata(getExamMetadataByName(examName));
}

export function getImagingContrastOptionFromName(
  examName: string,
): ImagingContrastOption | undefined {
  if (!isContrastConfigurableExam(examName)) return undefined;
  if (/\s+con contraste$/i.test(examName)) return "with_contrast";
  if (/\s+sin contraste$/i.test(examName)) return "without_contrast";
  return undefined;
}

export function formatExamNameWithContrast(
  examName: string,
  option: ImagingContrastOption,
) {
  const metadata = getExamMetadataByName(examName);
  if (!metadata || !isContrastConfigurableMetadata(metadata)) return examName;
  return `${metadata.name} ${option === "with_contrast" ? "con contraste" : "sin contraste"}`;
}

export function getExamMetadataByClinicalExamId(clinicalExamId: string) {
  const mappedName = SYMPTOMS_CLINICAL_EXAM_ID_TO_MASTER_NAME[clinicalExamId];
  if (!mappedName) {
    return null;
  }
  return getExamMetadataByName(mappedName) ?? null;
}

export function getExamFonasaCodeByName(examName: string) {
  return getExamMetadataByName(examName)?.fonasaCode ?? "No informado";
}

export function getExamCategoryByName(examName: string): ExamOrderCategory {
  return getExamMetadataByName(examName)?.category ?? "laboratory";
}

export function getExamSampleTypeByName(examName: string): ExamSampleType {
  return getExamMetadataByName(examName)?.sampleType ?? "Sangre";
}

export function getExamObservationForOrder(
  examName: string,
  options: {
    needsFasting: boolean;
    category?: ExamOrderCategory;
  },
) {
  const category = options.category ?? getExamCategoryByName(examName);
  const metadata = getExamMetadataByName(examName);

  if (metadata?.orderObservation) {
    return metadata.orderObservation;
  }

  if (category === "image") {
    return "Verifica con el centro si requiere preparación específica antes del examen.";
  }

  if (category === "procedure") {
    return "Requiere coordinación e indicaciones específicas según el procedimiento.";
  }

  if (category === "interconsultation") {
    return "Corresponde a orden de derivación para evaluación por especialista.";
  }

  if (options.needsFasting && metadata?.requiresFasting) {
    return "Requiere ayuno de 8 horas.";
  }

  if ((metadata?.sampleType ?? "").toLowerCase().includes("orina")) {
    return "Idealmente usar muestra de la mañana.";
  }

  return "No requiere preparación especial.";
}
