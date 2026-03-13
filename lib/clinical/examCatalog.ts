import { z } from "zod";

const examCategorySchema = z.enum(["marker", "laboratory", "image", "procedure"]);

const clinicalExamSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  category: examCategorySchema,
  shortDescription: z.string().min(1),
});

export type ClinicalExamCategory = z.infer<typeof examCategorySchema>;
export type ClinicalExam = z.infer<typeof clinicalExamSchema>;

const RAW_EXAM_CATALOG = [
  {
    id: "no_routine_exams",
    label: "Sin exámenes de rutina",
    category: "marker",
    shortDescription: "Marcador explícito para flujos ambulatorios que no requieren exámenes iniciales.",
  },
  {
    id: "cbc",
    label: "Hemograma (CBC)",
    category: "laboratory",
    shortDescription: "Evaluación hematológica basal.",
  },
  {
    id: "crp",
    label: "Proteína C reactiva (PCR)",
    category: "laboratory",
    shortDescription: "Marcador inflamatorio de apoyo.",
  },
  {
    id: "esr",
    label: "Velocidad de eritrosedimentación (VHS/ESR)",
    category: "laboratory",
    shortDescription: "Marcador inflamatorio inespecífico de curso subagudo/crónico.",
  },
  {
    id: "creatinine",
    label: "Creatinina en sangre",
    category: "laboratory",
    shortDescription: "Función renal basal.",
  },
  {
    id: "electrolytes",
    label: "Electrolitos en sangre",
    category: "laboratory",
    shortDescription: "Sodio, potasio y cloro en sangre.",
  },
  {
    id: "bmp_or_basic_metabolic_panel",
    label: "Perfil metabólico básico",
    category: "laboratory",
    shortDescription: "Panel bioquímico básico para contexto clínico general.",
  },
  {
    id: "liver_panel",
    label: "Perfil hepático",
    category: "laboratory",
    shortDescription: "Evaluación basal de función hepática.",
  },
  {
    id: "lipase",
    label: "Lipasa",
    category: "laboratory",
    shortDescription: "Marcador de apoyo ante dolor abdominal superior y vómitos.",
  },
  {
    id: "glucose",
    label: "Glucosa en sangre",
    category: "laboratory",
    shortDescription: "Tamizaje metabólico básico.",
  },
  {
    id: "urinalysis",
    label: "Orina completa (urinalysis)",
    category: "laboratory",
    shortDescription: "Análisis químico y microscópico de orina.",
  },
  {
    id: "urine_culture",
    label: "Urocultivo",
    category: "laboratory",
    shortDescription: "Estudio microbiológico urinario.",
  },
  {
    id: "pregnancy_test",
    label: "Test de embarazo (hCG)",
    category: "laboratory",
    shortDescription: "Detección de embarazo en contexto clínico pertinente.",
  },
  {
    id: "chest_xray",
    label: "Radiografía de tórax",
    category: "image",
    shortDescription: "Imagen inicial en evaluación respiratoria seleccionada.",
  },
  {
    id: "ecg",
    label: "Electrocardiograma (ECG)",
    category: "procedure",
    shortDescription: "Evaluación eléctrica cardíaca de primera línea.",
  },
  {
    id: "stool_culture",
    label: "Coprocultivo",
    category: "laboratory",
    shortDescription: "Estudio microbiológico de deposiciones.",
  },
  {
    id: "h_pylori_stool_antigen",
    label: "Antígeno de Helicobacter pylori en deposiciones",
    category: "laboratory",
    shortDescription: "Test no invasivo para infección por H. pylori.",
  },
  {
    id: "sti_naat",
    label: "NAAT ITS (CT/NG según contexto)",
    category: "laboratory",
    shortDescription: "Detección molecular de infecciones de transmisión sexual.",
  },
  {
    id: "vaginal_naat",
    label: "NAAT vaginal",
    category: "laboratory",
    shortDescription: "Detección molecular en flujo vaginal según sospecha clínica.",
  },
  {
    id: "rf",
    label: "Factor reumatoide (FR)",
    category: "laboratory",
    shortDescription: "Autoanticuerpo de apoyo en artritis inflamatoria.",
  },
  {
    id: "anti_ccp",
    label: "Anticuerpo anti-CCP",
    category: "laboratory",
    shortDescription: "Autoanticuerpo de apoyo en artritis reumatoide.",
  },
] as const satisfies readonly ClinicalExam[];

function validateExamCatalog(catalog: readonly ClinicalExam[]) {
  const parsed = z.array(clinicalExamSchema).parse(catalog);
  const ids = new Set<string>();

  for (const exam of parsed) {
    if (ids.has(exam.id)) {
      throw new Error(`ID de examen duplicado en catálogo clínico: ${exam.id}`);
    }
    ids.add(exam.id);
  }

  return parsed;
}

export const EXAM_CATALOG = validateExamCatalog(RAW_EXAM_CATALOG);
export const EXAM_CATALOG_MAP = new Map(EXAM_CATALOG.map((exam) => [exam.id, exam]));
export const EXAM_CATALOG_IDS = new Set(EXAM_CATALOG.map((exam) => exam.id));

export function getExamById(examId: string) {
  return EXAM_CATALOG_MAP.get(examId);
}

