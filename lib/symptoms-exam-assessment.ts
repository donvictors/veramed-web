import { z } from "zod";

const brief = z.string().min(3).max(500);
export const careLevelSchema = z.enum(["no_tests", "outpatient_tests", "presencial_priority", "emergency"]);
export const evidenceSchema = z.object({ source_id: z.string().min(1).max(80), quote: z.string().min(1).max(500) });
export const candidateTestSchema = z.object({
  id: z.string().min(1).max(80),
  test: brief,
  trigger: brief,
  rationale: z.string().min(20).max(400),
  evidence: z.array(evidenceSchema).min(1).max(5),
  target_diagnosis: brief,
  clinical_question: brief,
  information_sought: brief,
  management_impact: brief,
  priority: z.enum(["essential", "useful", "optional"]),
  purpose: z.enum(["diagnostic", "screening"]),
  timing: z.enum(["now", "later"]),
  reasonable_hypothesis: z.boolean(),
  supported_by_history: z.boolean(),
  appropriate_test: z.boolean(),
  changes_management: z.boolean(),
  necessary_information: z.boolean(),
  // Same key for tests answering the SAME question, not for a whole organ/system.
  information_key: brief,
  specimen_or_anatomy: z.string().min(3).max(180),
  missing_information: z.array(brief).max(6),
});
export const examAssessmentSchema = z.object({
  chief_complaint: brief,
  red_flags: z.array(brief).max(12),
  care_level: careLevelSchema,
  patient_guidance: z.string().min(10).max(900),
  differential: z.array(z.object({
    diagnosis: brief,
    supporting_features: z.array(evidenceSchema).min(1).max(6),
    features_against: z.array(brief).max(6),
    missing_information: z.array(brief).max(6),
  })).max(5),
  candidate_tests: z.array(candidateTestSchema).max(12),
  screening_opportunities: z.array(brief).max(6),
});
export const examAuditSchema = z.object({
  care_level: careLevelSchema,
  patient_guidance: z.string().min(10).max(900),
  red_flags: z.array(brief).max(12),
  decisions: z.array(z.object({
    candidate_id: z.string().min(1).max(80),
    keep: z.boolean(),
    supported_by_history: z.boolean(),
    appropriate_test_and_site: z.boolean(),
    changes_management_now: z.boolean(),
    necessary_nonredundant_information: z.boolean(),
    reason: brief,
  })).max(12),
});
export const savedExamDecisionSchema = z.object({
  version: z.literal("symptoms-exams-v3"),
  assessment: examAssessmentSchema,
  audit: examAuditSchema.nullable(),
  accepted_tests: z.array(z.object({ name: brief, why: z.string().min(3).max(2200) })).max(12),
  excluded_tests: z.array(z.object({ test: brief, reason: brief })).max(12),
  care_level: careLevelSchema,
  patient_guidance: z.string().min(10).max(1600),
  red_flags: z.array(brief).max(36),
  status: z.enum(["audited", "review_required"]),
});
export type ExamAssessment = z.infer<typeof examAssessmentSchema>;
export type ExamAudit = z.infer<typeof examAuditSchema>;
export type SavedExamDecision = z.infer<typeof savedExamDecisionSchema>;
export type ClinicalSource = { id: string; text: string; question?: string };
export type CareLevel = z.infer<typeof careLevelSchema>;

export const CARE_LABELS: Record<CareLevel, string> = {
  no_tests: "Ningún examen por ahora",
  outpatient_tests: "Estudio ambulatorio dirigido",
  presencial_priority: "Evaluación presencial prioritaria",
  emergency: "Acude a urgencias",
};

const rank: Record<CareLevel, number> = { no_tests: 0, outpatient_tests: 1, presencial_priority: 2, emergency: 3 };
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const evidenceText = (text: string) => normalize(text).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// Known mismatches are blocked even if both model passes say the test is suitable.
// Scope is the candidate's diagnostic target; a concurrent urinary/hepatic episode
// must have its OWN supported hypothesis, not borrow anal pain as justification.
export function anatomicalMismatch(candidate: z.infer<typeof candidateTestSchema>): string | null {
  const target = normalize(candidate.target_diagnosis);
  const anorectal = /\b(?:anal|perianal|rectal|perirrectal|anorrectal)\b|proctitis|hemorroid/.test(target);
  if (!anorectal) return null;
  const unrelated = new Set([
    "Ecografía abdominal", "Anticuerpos anti Virus Hepatitis C",
    "Antígeno de superficie Virus Hepatitis B (HBsAg)",
    "Antígeno de Helicobacter pylori en deposiciones", "Dímero D",
    "Perfil hepático", "Urocultivo", "Orina completa", "Sangre oculta en deposiciones",
  ]);
  if (unrelated.has(candidate.test)) return "Este examen no evalúa la hipótesis anorrectal indicada; requiere una hipótesis independiente con evidencia propia.";
  if (candidate.test === "PCR Chlamydia trachomatis y Neisseria gonorrhoeae") {
    const site = normalize(candidate.specimen_or_anatomy);
    if (!/rectal/.test(site) || /vaginal|endocervical|orina/.test(site)) return "Para proctitis la muestra debe ser rectal; una muestra urinaria, vaginal o endocervical no la sustituye.";
  }
  return null;
}
const generic = /evaluacion amplia|descartar infecciones$|sistemas (?:corporales|afectados)|chequeo general/;

/** Mechanical final gate. Clinical appropriateness also requires a separate model audit and physician review. */
export function finalizeExamDecision(input: {
  assessment: ExamAssessment;
  audit: ExamAudit | null;
  sources: ClinicalSource[];
  catalogNames: string[];
  safety?: { care_level: CareLevel; red_flags: string[] };
}): SavedExamDecision {
  const { assessment, audit } = input;
  const catalog = new Set(input.catalogNames);
  const sources = new Map(input.sources.map(source => [source.id, evidenceText(source.text)]));
  const verified = (evidence: z.infer<typeof evidenceSchema>) =>
    Boolean(evidenceText(evidence.quote) && (` ${sources.get(evidence.source_id) ?? ""} `).includes(` ${evidenceText(evidence.quote)} `));
  let care_level = [assessment.care_level, audit?.care_level ?? "no_tests", input.safety?.care_level ?? "no_tests"]
    .sort((a, b) => rank[b] - rank[a])[0];
  const accepted_tests: SavedExamDecision["accepted_tests"] = [];
  const excluded_tests: SavedExamDecision["excluded_tests"] = [];
  const names = new Set<string>();
  const information = new Set<string>();
  const priority = { essential: 0, useful: 1, optional: 2 };
  for (const candidate of [...assessment.candidate_tests].sort((a, b) => priority[a.priority] - priority[b.priority])) {
    const decisions = audit?.decisions.filter(item => item.candidate_id === candidate.id) ?? [];
    const decision = decisions.length === 1 ? decisions[0] : undefined;
    const differential = assessment.differential.find(item => normalize(item.diagnosis) === normalize(candidate.target_diagnosis));
    let reason = "";
    if (!catalog.has(candidate.test)) reason = "Examen fuera del catálogo.";
    else if (assessment.candidate_tests.filter(item => item.id === candidate.id).length !== 1) reason = "Identificador de candidato ambiguo.";
    else if (anatomicalMismatch(candidate)) reason = anatomicalMismatch(candidate)!;
    else if (candidate.purpose === "screening") reason = "Screening separado del estudio diagnóstico del episodio.";
    else if (candidate.priority === "optional" || candidate.timing !== "now") reason = "No necesario en la evaluación inicial.";
    else if (candidate.missing_information.length) reason = "La indicación depende de información no obtenida.";
    else if (!differential || !differential.supporting_features.every(verified) || !candidate.evidence.every(verified)) reason = "Hipótesis o evidencia sin respaldo en las respuestas reales.";
    else if (![candidate.reasonable_hypothesis, candidate.supported_by_history, candidate.appropriate_test, candidate.changes_management, candidate.necessary_information].every(Boolean)) reason = "No supera el umbral de utilidad clínica.";
    else if ([candidate.trigger, candidate.rationale, candidate.target_diagnosis, candidate.clinical_question, candidate.management_impact].some(text => generic.test(normalize(text)))) reason = "Justificación inespecífica.";
    else if (!decision || ![decision.keep, decision.supported_by_history, decision.appropriate_test_and_site, decision.changes_management_now, decision.necessary_nonredundant_information].every(Boolean)) reason = decision?.reason ?? "Sin auditoría clínica independiente satisfactoria.";
    else if (names.has(candidate.test) || information.has(normalize(candidate.information_key))) reason = "Información redundante con otro examen seleccionado.";
    if (reason) { excluded_tests.push({ test: candidate.test, reason }); continue; }
    names.add(candidate.test);
    information.add(normalize(candidate.information_key));
    accepted_tests.push({ name: candidate.test, why: `${candidate.rationale} Muestra/sitio: ${candidate.specimen_or_anatomy.replace(/[.\s]+$/, "")}.` });
  }
  // Care setting is an advisory, never an order veto. Urgent patients retain justified tests.
  const red_flags = [...new Set([...assessment.red_flags, ...(audit?.red_flags ?? []), ...(input.safety?.red_flags ?? [])])];
  const reviewRequired = !audit || assessment.candidate_tests.some(test =>
    test.priority !== "optional" && test.purpose === "diagnostic" && test.timing === "now" &&
    !accepted_tests.some(accepted => accepted.name === test.test) &&
    audit.decisions.find(decision => decision.candidate_id === test.id)?.keep !== false);
  if (red_flags.length && rank[care_level] < 2) care_level = "presencial_priority";
  if (reviewRequired && rank[care_level] < rank.presencial_priority) care_level = "presencial_priority";
  if (rank[care_level] < 2) care_level = accepted_tests.length ? "outpatient_tests" : "no_tests";
  const guidance = audit?.patient_guidance ?? assessment.patient_guidance;
  const warning = care_level === "emergency"
    ? "Acude a urgencias ahora. Puedes continuar con tu orden, pero no esperes la firma, la toma de exámenes ni sus resultados para acudir. La orden no reemplaza la evaluación urgente."
    : care_level === "presencial_priority"
      ? "Busca evaluación médica presencial prioritaria. Puedes continuar con tu orden; no retrases la consulta esperando la firma, los exámenes o sus resultados."
      : "";
  return savedExamDecisionSchema.parse({
    version: "symptoms-exams-v3", assessment, audit, accepted_tests, excluded_tests, care_level,
    patient_guidance: [warning, guidance, reviewRequired ? "La selección automática requiere revisión médica; que no aparezcan exámenes no descarta una enfermedad." : ""].filter(Boolean).join(" "),
    red_flags, status: reviewRequired ? "review_required" : "audited",
  });
}

export function unavailableExamAssessment(chiefComplaint: string): ExamAssessment {
  return {
    chief_complaint: chiefComplaint.slice(0, 500) || "Consulta por síntomas",
    red_flags: [], care_level: "presencial_priority",
    patient_guidance: "No pudimos completar una selección fiable de exámenes. Un médico debe revisar tu historia y definir los estudios pertinentes.",
    differential: [], candidate_tests: [], screening_opportunities: [],
  };
}
