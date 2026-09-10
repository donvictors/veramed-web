import type { ClinicalSource, ExamAssessment } from "./symptoms-exam-assessment";

type Evidence = { source_id: string; quote: string };
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Conservative recognition of explicit statements only. Never infer a positive from a question. */
function reported(sources: ClinicalSource[], pattern: RegExp): Evidence | null {
  for (const source of sources) {
    if (source.id === "patient_context" || source.id.startsWith("antecedent_")) continue;
    for (const clause of source.text.split(/[.!?;\n]|\bpero\b/i)) {
      const match = pattern.exec(clause);
      if (!match) continue;
      const prefix = normalize(clause.slice(0, match.index));
      // Ambiguous/negated statements cannot activate a protocol. Includes lists of negatives.
      if (/\b(?:no|sin|niego|nunca|tampoco|tal vez|quizas|no se)\b/.test(prefix)) continue;
      if (/\b(?:negad[oa]|ausente|descartad[oa])\b/.test(normalize(clause.slice(match.index + match[0].length, match.index + match[0].length + 22)))) continue;
      return { source_id: source.id, quote: match[0] };
    }
  }
  return null;
}

function applyProtocol(assessment: ExamAssessment, diagnosis: string, evidence: Evidence[], candidates: Array<{
  id: string; test: string; trigger: string; question: string; information: string; impact: string; specimen: string; rationale: string;
}>) {
  const names = new Set(candidates.map(candidate => candidate.test));
  assessment.differential = [
    { diagnosis, supporting_features: evidence, features_against: [], missing_information: [] },
    ...assessment.differential.filter(item => item.diagnosis !== diagnosis),
  ].slice(0, 5);
  assessment.candidate_tests = [
    ...candidates.map(candidate => ({
      id: candidate.id, test: candidate.test, trigger: candidate.trigger, rationale: candidate.rationale,
      evidence, target_diagnosis: diagnosis, clinical_question: candidate.question,
      information_sought: candidate.information, management_impact: candidate.impact,
      priority: "essential" as const, purpose: "diagnostic" as const, timing: "now" as const,
      reasonable_hypothesis: true, supported_by_history: true, appropriate_test: true, changes_management: true,
      necessary_information: true, information_key: candidate.id,
      specimen_or_anatomy: candidate.specimen, missing_information: [],
    })),
    ...assessment.candidate_tests.filter(candidate => !names.has(candidate.test)),
  ].slice(0, 12);
}

/** Narrow guideline-based candidate protocols. Still subject to independent audit and the final gates. */
export function applyDirectedExamProtocols(original: ExamAssessment, sources: ClinicalSource[]): ExamAssessment {
  const assessment = structuredClone(original);
  const dysuria = reported(sources, /disuria|ardor al orinar/i);
  const frequency = reported(sources, /polaquiuria|orino (?:muy )?(?:seguido|frecuentemente)|aumento de (?:la )?frecuencia urinaria/i);
  const fever = reported(sources, /fiebre(?: medida)?(?: (?:de )?\d+(?:[.,]\d+)?)?/i);
  if (dysuria && frequency && fever) {
    applyProtocol(assessment, "Sospecha de infección urinaria febril", [dysuria, frequency, fever], [
      { id: "protocol-urinary-inflammation", test: "Orina completa", trigger: "Disuria y polaquiuria con fiebre declaradas", question: "¿Hay piuria u otros hallazgos que apoyen infección urinaria?", information: "Leucocitos y nitritos en orina", impact: "Apoyar o reconsiderar el origen urinario del episodio", specimen: "Orina de segundo chorro",
        rationale: "Disuria y polaquiuria con fiebre: busca piuria y nitritos para apoyar o reconsiderar el origen urinario. Se interpreta junto con la evaluación clínica y el urocultivo." },
      { id: "protocol-urinary-culture", test: "Urocultivo", trigger: "Síntomas urinarios con fiebre declarada", question: "¿Qué bacteria causa la infección y a qué antimicrobianos es sensible?", information: "Agente bacteriano y susceptibilidad antimicrobiana", impact: "Ajustar el tratamiento según cultivo y susceptibilidad", specimen: "Orina de segundo chorro, idealmente antes de antibióticos, sin retrasar atención",
        rationale: "Síntomas urinarios con fiebre: identifica la bacteria y su susceptibilidad para ajustar el tratamiento. Aporta información que la orina completa no entrega." },
    ]);
    if (assessment.care_level !== "emergency") assessment.care_level = "presencial_priority";
    assessment.patient_guidance = "La fiebre con síntomas urinarios requiere evaluación médica hoy. Los exámenes complementan esa consulta; no esperes sus resultados para acudir.";
  }
  const analPain = reported(sources, /dolor (?:anal|rectal|anorrectal)/i);
  const rectalInflammation = reported(sources, /secreci[oó]n (?:rectal|anal)|tenesmo/i);
  const exposure = reported(sources, /(?:sexo|contacto|exposici[oó]n)(?: sexual)? anal receptiv[oa]|penetraci[oó]n anal receptiva/i);
  if (analPain && rectalInflammation && exposure) {
    applyProtocol(assessment, "Sospecha de proctitis de transmisión sexual", [analPain, rectalInflammation, exposure], [
      { id: "protocol-rectal-naat", test: "PCR Chlamydia trachomatis y Neisseria gonorrhoeae", trigger: "Dolor anal con secreción o tenesmo tras exposición anal receptiva", question: "¿Hay infección rectal por gonococo o clamidia?", information: "Detección de gonococo y clamidia en el sitio sintomático", impact: "Dirigir tratamiento y manejo de contactos según agente", specimen: "Hisopado rectal; confirmar disponibilidad de toma con el laboratorio",
        rationale: "Dolor anal con secreción o tenesmo y exposición anal receptiva: busca gonococo y clamidia en el recto para orientar el tratamiento y manejo de contactos. La muestra urinaria no sustituye la rectal." },
      { id: "protocol-proctitis-syphilis", test: "RPR/VDRL", trigger: "Síndrome de proctitis con exposición sexual anal", question: "¿Hay evidencia serológica de sífilis como causa de proctitis?", information: "Serología no treponémica, a interpretar con confirmación y antecedentes", impact: "Definir confirmación, etapificación y tratamiento específico si corresponde", specimen: "Sangre",
        rationale: "Proctitis tras exposición sexual anal: evalúa sífilis dentro del diferencial del episodio. Un resultado reactivo requiere interpretación clínica y confirmación para definir el manejo." },
    ]);
    assessment.screening_opportunities = [...new Set([...assessment.screening_opportunities, "Ofrecer prueba de VIH y evaluación de otras ITS según los sitios de exposición, separadas de la orden diagnóstica del episodio."])].slice(0, 6);
    if (assessment.care_level !== "emergency") assessment.care_level = "presencial_priority";
    assessment.patient_guidance = "Requiere evaluación presencial del área anorrectal. Los estudios dirigidos pueden acompañar la consulta; no la retrases esperando resultados.";
  }
  const headache = reported(sources, /cefalea|dolor de cabeza/i);
  const sudden = reported(sources, /comenz[oó] de golpe|inicio (?:s[uú]bito|explosivo)|cefalea (?:s[uú]bita|explosiva)/i);
  const peak = reported(sources, /m[aá]xima (?:intensidad(?: de dolor)?|en segundos)(?: en segundos)?|intensidad m[aá]xima en segundos/i);
  if (headache && sudden && peak) {
    applyProtocol(assessment, "Sospecha de hemorragia subaracnoidea", [headache, sudden, peak], [
      { id: "protocol-thunderclap-ct", test: "TC de cerebro", trigger: "Cefalea súbita que alcanza máxima intensidad rápidamente", question: "¿Hay una hemorragia intracraneal que requiere manejo urgente?", information: "Hemorragia intracraneal en TC sin contraste", impact: "Orientar manejo urgente; un estudio negativo puede requerir evaluación adicional", specimen: "Cerebro, TC sin contraste en contexto de urgencias",
        rationale: "Cefalea súbita con máxima intensidad rápida: busca hemorragia intracraneal para orientar el manejo urgente. Una TC negativa no descarta por sí sola todas las causas; no esperes esta orden para acudir a urgencias." },
    ]);
    assessment.care_level = "emergency";
    assessment.red_flags = [...new Set([...assessment.red_flags, "Cefalea de inicio explosivo con máxima intensidad rápida"])].slice(0, 12);
    assessment.patient_guidance = "Acude a urgencias ahora. La orden de imagen acompaña la evaluación y nunca debe retrasarla.";
  }
  return assessment;
}
