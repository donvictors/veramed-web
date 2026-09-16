import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-typescript.mjs";
import { ensureAnorectalDiscriminators, getClinicalMap, createInitialClinicalPlan, reconcileQuestionQueue } from "../lib/server/symptoms-interview-engine.mjs";

const policy = loadModule("lib/symptoms-exam-assessment.ts");
const { EXAM_MASTER_CATALOG } = loadModule("lib/exam-master-catalog.ts");
const catalogNames = EXAM_MASTER_CATALOG.map(exam => exam.name);
const NAAT = "PCR Chlamydia trachomatis y Neisseria gonorrhoeae";
const unrelated = ["Anticuerpos anti Virus Hepatitis C", "Antígeno de superficie Virus Hepatitis B (HBsAg)", "Antígeno de Helicobacter pylori en deposiciones", "Dímero D", "Perfil hepático", "Ecografía abdominal"];

function proposal(text, diagnosis, names, care_level = "outpatient_tests") {
  const evidence = [{ source_id: "initial", quote: text }];
  return {
    chief_complaint: text, red_flags: [], care_level,
    patient_guidance: care_level === "no_tests" ? "Sin estudios iniciales. Consulta si persiste, empeora o aparece una señal de alarma." : "Consulta para evaluación clínica y seguimiento de este episodio.",
    differential: [{ diagnosis, supporting_features: evidence, features_against: [], missing_information: [] }],
    candidate_tests: names.map((name, index) => ({
      id: `test_${index}`, test: name, trigger: text, evidence, target_diagnosis: diagnosis,
      rationale: `${name}: ${text}. Evalúa ${diagnosis} para orientar la conducta médica.`,
      clinical_question: `Precisar ${diagnosis} con ${name}`,
      information_sought: `Resultado específico de ${name}`,
      management_impact: "Orientar la evaluación médica del episodio según el resultado específico",
      priority: "essential", purpose: "diagnostic", timing: "now",
      reasonable_hypothesis: true, supported_by_history: true, appropriate_test: true, changes_management: true,
      necessary_information: true, information_key: `informacion_${index}`,
      specimen_or_anatomy: name === NAAT ? "Hisopado rectal; confirmar toma disponible en laboratorio" : /[Oo]rina|[Uu]rocultivo/.test(name) ? "Orina de segundo chorro" : name === "TC de cerebro" ? "Cerebro" : "Sangre",
      missing_information: [],
    })), screening_opportunities: [],
  };
}
function auditFor(assessment, keepNames = assessment.candidate_tests.map(test => test.test)) {
  return {
    care_level: assessment.care_level, patient_guidance: assessment.patient_guidance, red_flags: assessment.red_flags,
    decisions: assessment.candidate_tests.map(candidate => ({
      candidate_id: candidate.id, keep: keepNames.includes(candidate.test),
      supported_by_history: keepNames.includes(candidate.test), appropriate_test_and_site: keepNames.includes(candidate.test),
      changes_management_now: keepNames.includes(candidate.test), necessary_nonredundant_information: keepNames.includes(candidate.test),
      reason: keepNames.includes(candidate.test) ? "Responde una pregunta necesaria del episodio con muestra adecuada." : "No aporta información necesaria para decidir sobre este episodio.",
    })),
  };
}
function run(assessment, audit = auditFor(assessment), extra = {}) {
  return policy.finalizeExamDecision({ assessment: policy.examAssessmentSchema.parse(assessment), audit: audit && policy.examAuditSchema.parse(audit), sources: [{ id: "initial", text: assessment.chief_complaint }], catalogNames, ...extra });
}
const scenarios = [
  { name: "fisura probable: dolor al defecar, pequeña rectorragia y sin fiebre", text: "Dolor anal al defecar y pequeña rectorragia, sin fiebre ni masa.", diagnosis: "Posible fisura anal", care: "no_tests", expected: [], extra: ["Hemograma", "Urocultivo"] },
  { name: "absceso: advierte y mantiene complemento justificado sin batería", text: "Dolor anal continuo, fiebre de 39 grados, masa perianal y decaimiento marcado.", diagnosis: "Posible absceso perianal con repercusión sistémica", care: "presencial_priority", expected: ["Hemograma"], extra: ["Urocultivo"] },
  { name: "proctitis: estudios de ITS dirigidos al recto", text: "Dolor anal, secreción rectal y tenesmo tras exposición sexual anal receptiva sin preservativo.", diagnosis: "Posible proctitis infecciosa por ITS", care: "presencial_priority", expected: [NAAT, "RPR/VDRL"], extra: ["Urocultivo"] },
  { name: "disuria, polaquiuria y fiebre: estudio urinario dirigido", text: "Disuria y polaquiuria con fiebre; tolero líquidos, sin vómitos, confusión ni dolor en flancos.", diagnosis: "Posible infección urinaria febril", care: "presencial_priority", expected: ["Orina completa", "Urocultivo"], extra: [NAAT] },
  { name: "cefalea habitual sin alarmas: ningún laboratorio ni imagen rutinaria", text: "Cefalea igual a mis migrañas habituales, sin fiebre, déficit focal ni comienzo explosivo.", diagnosis: "Posible cefalea primaria de patrón habitual", care: "no_tests", expected: [], extra: ["Hemograma", "TC de cerebro", "RM de cerebro"] },
  { name: "cefalea explosiva: urgencias y conserva imagen específicamente justificada", text: "Cefalea súbita explosiva, máxima en segundos y primera de este tipo, hace una hora.", diagnosis: "Sospecha de hemorragia subaracnoidea", care: "emergency", expected: ["TC de cerebro"], extra: ["Hemograma", "RM de cerebro"] },
  { name: "síntoma benigno autolimitado: cero exámenes explícitamente", text: "Molestia muscular leve tras ejercicio, resuelta hoy, sin fiebre, debilidad ni otros síntomas.", diagnosis: "Molestia muscular transitoria", care: "no_tests", expected: [], extra: ["Hemograma", "Orina completa"] },
];
for (const scenario of scenarios) {
  test(`escenario clínico: ${scenario.name}`, () => {
    const assessment = proposal(scenario.text, scenario.diagnosis, [...scenario.expected, ...scenario.extra, ...unrelated], scenario.care);
    if (scenario.care === "emergency") assessment.red_flags = ["Cefalea explosiva de inicio reciente"];
    const result = run(assessment, auditFor(assessment, scenario.expected));
    assert.equal(result.care_level, scenario.care);
    assert.deepEqual(result.accepted_tests.map(test => test.name), scenario.expected);
    for (const name of [...scenario.extra, ...unrelated]) assert.ok(!result.accepted_tests.some(test => test.name === name), name);
    if (scenario.care === "emergency" || scenario.care === "presencial_priority") assert.match(result.patient_guidance, /no (?:esperes|retrases)/i);
    if (scenario.expected.includes(NAAT)) assert.match(result.accepted_tests.find(test => test.name === NAAT).why, /rectal/);
    assert.ok(result.accepted_tests.every(test => !/evaluación amplia/.test(test.why)));
  });
}

test("los cuatro gates, necesidad actual, evidencia y auditoría son obligatorios", () => {
  for (const field of ["reasonable_hypothesis", "supported_by_history", "appropriate_test", "changes_management", "necessary_information"]) {
    const assessment = proposal("Disuria y fiebre medidas ayer.", "Infección urinaria febril", ["Urocultivo"]);
    assessment.candidate_tests[0][field] = false;
    assert.equal(run(assessment).accepted_tests.length, 0, field);
  }
  for (const edit of [
    candidate => { candidate.priority = "optional"; },
    candidate => { candidate.timing = "later"; },
    candidate => { candidate.purpose = "screening"; },
    candidate => { candidate.missing_information = ["Confirmar síntomas urinarios"]; },
    candidate => { candidate.evidence[0] = { source_id: "q_50", quote: "Respuesta inventada" }; },
    candidate => { candidate.target_diagnosis = "Hipótesis no documentada"; },
    candidate => { candidate.rationale = "Permite una evaluación amplia de los sistemas afectados."; },
  ]) {
    const assessment = proposal("Disuria y fiebre medidas ayer.", "Infección urinaria febril", ["Urocultivo"]);
    edit(assessment.candidate_tests[0]);
    assert.equal(run(assessment).accepted_tests.length, 0);
  }
});
test("un sí a una pregunta no es evidencia de todos sus síntomas; la pregunta no es fuente", () => {
  const assessment = proposal("Disuria y fiebre medidas ayer.", "Infección urinaria febril", ["Urocultivo"]);
  assessment.candidate_tests[0].evidence = [{ source_id: "q_0", quote: "fiebre medida" }];
  assert.equal(run(assessment, auditFor(assessment), { sources: [{ id: "initial", text: assessment.chief_complaint }, { id: "q_0", text: "Sí", question: "¿Tienes fiebre medida o molestias?" }] }).accepted_tests.length, 0);
});
test("auditoría rechaza evidencia negada aun si el primer modelo la interpreta positiva", () => {
  const assessment = proposal("No tengo disuria ni fiebre.", "Infección urinaria febril", ["Urocultivo"]);
  const audit = auditFor(assessment, []);
  assert.equal(run(assessment, audit).accepted_tests.length, 0);
});
test("auditoría separada controla anatomía, cambios de conducta y redundancia", () => {
  for (const field of ["supported_by_history", "appropriate_test_and_site", "changes_management_now", "necessary_nonredundant_information", "keep"]) {
    const assessment = proposal("Dolor anal, secreción y exposición sexual receptiva.", "Proctitis infecciosa", [NAAT]);
    const audit = auditFor(assessment); audit.decisions[0][field] = false;
    assert.equal(run(assessment, audit).accepted_tests.length, 0, field);
  }
  const assessment = proposal("Disuria y fiebre medidas ayer.", "Infección urinaria febril", ["Urocultivo", "Urocultivo"]);
  assert.equal(run(assessment).accepted_tests.length, 1);
  assessment.candidate_tests[1].test = "Orina completa";
  assessment.candidate_tests[1].information_key = assessment.candidate_tests[0].information_key;
  assert.equal(run(assessment).accepted_tests.length, 1);
});
test("screening permanece separado incluso cuando el auditor intentaría incluirlo", () => {
  const assessment = proposal("Dolor anal sin síntomas hepáticos.", "Fisura anal posible", [unrelated[0]], "no_tests");
  assessment.screening_opportunities = ["Ofrecer prevención de hepatitis según riesgo, en evaluación separada."];
  assessment.candidate_tests[0].purpose = "screening";
  const result = run(assessment);
  assert.equal(result.accepted_tests.length, 0);
  assert.equal(result.assessment.screening_opportunities.length, 1);
});
test("falla o auditoría incompleta requiere revisión sin emitir candidatos no verificados", () => {
  const assessment = proposal("Disuria y fiebre medidas ayer.", "Infección urinaria febril", ["Urocultivo"]);
  for (const audit of [null, { ...auditFor(assessment), decisions: [] }]) {
    const result = run(assessment, audit);
    assert.equal(result.accepted_tests.length, 0);
    assert.equal(result.status, "review_required");
    assert.equal(result.care_level, "presencial_priority");
  }
  const result = run(policy.unavailableExamAssessment("Dolor anal y fiebre"), null);
  assert.match(result.patient_guidance, /no descarta una enfermedad/);
});
test("el modelo no puede rebajar una alarma previa y esta no elimina exámenes útiles", () => {
  const assessment = proposal("Disuria y fiebre medidas ayer.", "Infección urinaria febril", ["Urocultivo"]);
  const result = run(assessment, auditFor(assessment), { safety: { care_level: "emergency", red_flags: ["Deterioro sistémico significativo"] } });
  assert.equal(result.care_level, "emergency");
  assert.deepEqual(result.accepted_tests.map(test => test.name), ["Urocultivo"]);
});

test("mapa anorrectal pregunta anatomía correcta y cubre discriminadores sin cola genital", () => {
  const map = getClinicalMap("dysuria_lower_uti", { sex: "male", symptomsText: "Dolor anal, secreción rectal y tenesmo" });
  const ids = map.domains.map(domain => domain.id);
  for (const id of ["onset", "anorectal_alarm", "anorectal_defecation", "anorectal_discharge", "anorectal_bowel", "anorectal_exposure", "anorectal_risks", "urinary_pattern"]) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes("scrotal_alarm"));
  assert.ok(!ids.includes("genital_localization"));
});
test("restaura discriminadores omitidos antes de parar y no repite dominios contestados", () => {
  const plan = createInitialClinicalPlan({ flowId: "constipation", symptomsText: "Dolor anal", summary: "Dolor anal reciente", primarySymptom: "Dolor anal" });
  const input = { state: { ...plan.clinicalState, pendingDomains: [], readyToComplete: true }, queue: [], symptomsText: "Dolor anal", completedTurns: 1, answeredDomains: ["anorectal_alarm"] };
  const restored = ensureAnorectalDiscriminators(input);
  assert.equal(restored.state.readyToComplete, false);
  assert.ok(restored.queue.length > 0 && restored.queue.length <= 3);
  assert.ok(!restored.queue.some(question => question.targetDomain === "anorectal_alarm"));
  assert.deepEqual(ensureAnorectalDiscriminators({ ...input, completedTurns: 8 }).queue, []);
});
test("negar fiebre no elimina por accidente la pregunta sobre masa perianal", () => {
  const plan = createInitialClinicalPlan({ flowId: "constipation", symptomsText: "Dolor anal", summary: "Dolor anal reciente", primarySymptom: "Dolor anal" });
  const result = reconcileQuestionQueue({ state: plan.clinicalState, queue: plan.queue, currentQuestion: { targetDomain: "onset" }, answer: "Desde ayer, no tengo fiebre pero el dolor ha seguido molestando durante todo el día.", askedQuestions: [], turnNumber: 1 });
  assert.ok(result.queue.some(question => question.targetDomain === "anorectal_alarm"));
});

function mockRecord(decision) {
  return { id: "request-test", createdAt: 1, updatedAt: 2, patient: { fullName: "Prueba", rut: "", birthDate: "1990-01-01", email: "", phone: "", address: "" }, interpretation: { flowId: "headache", probableContext: "Cefalea", urgencyWarning: true }, symptomsText: "Cefalea de inicio explosivo", antecedents: {}, followUpAnswers: {}, selectedTests: decision.accepted_tests, suggestedTests: decision.accepted_tests, notes: [decision.patient_guidance], reviewStatus: "pending_validation", interviewMetadata: { examDecision: decision } };
}
test("mapper conserva nivel urgente, advertencia y orden; cero no resucita sugerencias", () => {
  const assessment = proposal("Cefalea súbita explosiva máxima al inicio.", "Hemorragia subaracnoidea posible", ["TC de cerebro"], "emergency");
  const decision = run(assessment);
  const { toSymptomsOrderDraftFromRecord } = loadModule("lib/server/symptoms-order-mapper.ts", { "@/lib/checkup": { createVerificationCode: () => "test-code" } });
  const record = mockRecord(decision);
  const order = toSymptomsOrderDraftFromRecord(record);
  assert.equal(order.flow.nextStep, "show_emergency_warning");
  assert.deepEqual(order.tests.map(test => test.name), ["TC de cerebro"]);
  assert.match(order.careDecision.patient_guidance, /no esperes/i);
  assert.equal(order.careDecision.assessment, undefined, "No exponer el diferencial interno");
  assert.equal(toSymptomsOrderDraftFromRecord({ ...record, reviewStatus: "validated", selectedTests: [] }).tests.length, 0);
});

// Endpoint integration: the persisted assessment and patient response use the SAME audited list.
test("build guarda y devuelve una orden urgente sin veto por nivel de atención", async () => {
  const scenario = scenarios[5];
  const assessment = proposal(scenario.text, scenario.diagnosis, scenario.expected, "emergency");
  const decision = run(assessment);
  const record = { ...mockRecord(decision), payment: { status: "paid" }, reviewStatus: "in_flow", aiConsentAt: 1, aiConsentVersion: "ai-health-data-v1", primarySymptom: scenario.text, oneLinerSummary: scenario.text, followUpQuestions: ["¿Cuándo comenzó?"], followUpAnswers: { q_0: "Hace una hora" }, interviewMetadata: { stopReason: "clinical_state_ready" }, symptomsText: scenario.text };
  let saved;
  const previous = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = "unit-test-placeholder";
  try {
    const { POST } = loadModule("app/api/sintomas/orders/build/route.ts", {
      "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
      "next/headers": { cookies: async () => ({ get: () => undefined }) },
      "@/lib/auth": { AUTH_SESSION_COOKIE: "session" },
      "@/lib/server/auth-store": { getUserFromSession: async () => null },
      "@/lib/server/internal-access": { hasValidInternalAccess: () => true },
      "@/lib/server/request-access": { getRequestAccessCookieName: () => "access", hasValidRequestAccessCookie: () => true },
      "@/lib/server/symptoms-interview": { LEGACY_MIN_INTERVIEW_TURNS: 4 },
      "@/lib/checkup": { createVerificationCode: () => "code", calculateAgeFromBirthDate: () => 36 },
      "@/lib/server/symptoms-openai": { suggestSymptomsExamsWithOpenAI: async input => { assert.equal(input.sources.find(source => source.id === "q_0").question, "¿Cuándo comenzó?"); return { assessment, audit: auditFor(assessment), oneLinerSummary: scenario.text, model: "fixture" }; } },
      "@/lib/server/symptoms-store": { getSymptomsRequest: async () => record, saveSymptomsOrderDraft: async input => { saved = input; return { ...record, ...input, selectedTests: input.suggestedTests, reviewStatus: "pending_validation" }; } },
      "@/lib/server/http-security": { requireSameOrigin() {}, enforceRateLimit: async () => {}, readJsonBody: async () => ({ requestId: record.id }), httpErrorResponse: error => { throw error; } },
    });
    const response = await POST(new Request("https://veramed.test/api/sintomas/orders/build", { method: "POST" }));
    assert.equal(response.status, 200);
    assert.equal(saved.interviewMetadata.examDecision.care_level, "emergency");
    assert.deepEqual(response.body.order.tests.map(test => test.name), scenario.expected);
    assert.equal(response.body.order.flow.nextStep, "show_emergency_warning");
    assert.match(response.body.order.careDecision.patient_guidance, /no esperes/i);
  } finally { if (previous === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previous; }
});

test("build agrega el panel de respaldo cuando la evaluación no selecciona exámenes", async () => {
  const text = "Molestia leve sin otros síntomas.";
  const assessment = proposal(text, "Molestia inespecífica", [], "no_tests");
  const decision = run(assessment);
  const record = {
    ...mockRecord(decision),
    payment: { status: "paid" },
    reviewStatus: "in_flow",
    aiConsentAt: undefined,
    aiConsentVersion: undefined,
    primarySymptom: text,
    oneLinerSummary: text,
    followUpQuestions: ["¿Cuándo comenzó?"],
    followUpAnswers: { q_0: "Hoy" },
    interviewMetadata: { stopReason: "clinical_state_ready" },
    symptomsText: text,
  };
  let saved;
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const { POST } = loadModule("app/api/sintomas/orders/build/route.ts", {
      "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
      "next/headers": { cookies: async () => ({ get: () => undefined }) },
      "@/lib/auth": { AUTH_SESSION_COOKIE: "session" },
      "@/lib/server/auth-store": { getUserFromSession: async () => null },
      "@/lib/server/internal-access": { hasValidInternalAccess: () => true },
      "@/lib/server/request-access": { getRequestAccessCookieName: () => "access", hasValidRequestAccessCookie: () => true },
      "@/lib/server/symptoms-interview": { LEGACY_MIN_INTERVIEW_TURNS: 4 },
      "@/lib/checkup": { createVerificationCode: () => "code", calculateAgeFromBirthDate: () => 36 },
      "@/lib/server/symptoms-openai": { suggestSymptomsExamsWithOpenAI: async () => { throw new Error("No debería invocarse sin API key"); } },
      "@/lib/server/symptoms-store": { getSymptomsRequest: async () => record, saveSymptomsOrderDraft: async input => { saved = input; return { ...record, ...input, selectedTests: input.suggestedTests, reviewStatus: "pending_validation" }; } },
      "@/lib/server/http-security": { requireSameOrigin() {}, enforceRateLimit: async () => {}, readJsonBody: async () => ({ requestId: record.id }), httpErrorResponse: error => { throw error; } },
    });
    const response = await POST(new Request("https://veramed.test/api/sintomas/orders/build", { method: "POST" }));
    assert.equal(response.status, 200);
    assert.deepEqual(saved.suggestedTests.map(test => test.name), [
      "Hemograma",
      "Creatinina en sangre",
      "Proteína C reactiva (PCR)",
      "Perfil bioquímico",
    ]);
    assert.deepEqual(response.body.order.tests, saved.suggestedTests);
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});

test("generador realiza dos llamadas separadas y no sustituye la auditoría con flags propios", async () => {
  const assessment = proposal("Dolor anal con secreción y exposición sexual anal.", "Proctitis infecciosa", [NAAT, "Urocultivo"]);
  const audit = auditFor(assessment, [NAAT]);
  const calls = [];
  const { suggestSymptomsExamsWithOpenAI } = loadModule("lib/server/symptoms-openai.ts", {
    "@ai-sdk/openai": { openai: { responses: model => model } },
    ai: { Output: { object: value => value }, generateText: async input => { calls.push(input); return { output: calls.length === 1 ? { oneLinerSummary: assessment.chief_complaint, assessment } : audit }; } },
    "@/lib/server/symptoms-interview-engine.mjs": { getClinicalMap: () => ({ domains: [] }) },
  });
  const prior = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = "test-placeholder";
  try {
    const output = await suggestSymptomsExamsWithOpenAI({ sources: [{ id: "initial", text: assessment.chief_complaint }] });
    assert.equal(calls.length, 2);
    assert.equal(calls[0].model, "gpt-5.6-luna");
    assert.equal(calls[1].model, "gpt-5.6-luna");
    assert.equal(output.model, "gpt-5.6-luna");
    assert.match(calls[1].system, /Audita críticamente/);
    assert.match(calls[1].prompt, /Propuesta a auditar/);
    assert.match(calls[0].system, /nunca bloquea la emisión/);
    assert.ok(!/Prioriza sensibilidad sobre especificidad/.test(calls[0].system));
    assert.deepEqual(run(output.assessment, output.audit).accepted_tests.map(test => test.name), [NAAT]);
  } finally { if (prior === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = prior; }
});

test("validación médica permite firmar en urgencias y cerrar cero exámenes sin crear PDF vacío", async () => {
  for (const withTests of [true, false]) {
    const assessment = proposal("Cefalea de inicio explosivo hace una hora.", "Hemorragia subaracnoidea posible", ["TC de cerebro"], "emergency");
    const record = { ...mockRecord(run(assessment)), payment: { status: "paid" } };
    let signed = 0;
    let validatedInput;
    let email = 0;
    const { POST } = loadModule("app/api/portal-medicos/symptoms/[id]/validate/route.ts", {
      "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
      "next/headers": { cookies: async () => ({ get: () => ({ value: "session" }) }) },
      "@/lib/server/medical-portal-auth": { MEDICAL_PORTAL_SESSION_COOKIE: "medical", canValidateMedicalOrders: () => true, verifyMedicalPortalSessionToken: async () => ({ userId: "doctor-test", email: "doctor@example.test", name: "Doctor", medicalRut: "test", sisRegistration: "test" }), recordMedicalAudit: async () => {} },
      "@/lib/server/symptoms-store": { getSymptomsRequest: async () => record, validateSymptomsOrder: async input => { validatedInput = input; return { ...record, selectedTests: input.selectedTests, reviewStatus: "validated" }; } },
      "@/lib/server/symptoms-order-pdf-assets": { ensureSymptomsSignedPdfAssets: async () => { signed++; return []; } },
      "@/lib/server/symptoms-order-email": { sendSymptomsValidatedOrderEmail: async () => { email++; } },
      "@/lib/server/order-pdf-access": { createTemporaryPdfAccessLinks: async () => [] },
      "@/lib/server/http-security": { requireSameOrigin() {}, readJsonBody: async () => ({ selectedExamNames: withTests ? ["TC de cerebro"] : [] }) },
    });
    const response = await POST(new Request("https://veramed.test/validate", { method: "POST" }), { params: Promise.resolve({ id: record.id }) });
    assert.equal(response.status, 200);
    assert.equal(validatedInput.selectedTests.length, withTests ? 1 : 0);
    assert.equal(signed, withTests ? 1 : 0);
    assert.equal(email, 1, "Conserva notificación de la evaluación al paciente (servicio mock)");
  }
});

const { applyDirectedExamProtocols } = loadModule("lib/symptoms-exam-protocols.ts");
test("protocolos corrigen omisiones clínicas sin depender de que el modelo recuerde cada prueba", () => {
  const cases = [
    ["Disuria y polaquiuria con fiebre medida 38 grados.", ["Orina completa", "Urocultivo"]],
    ["Dolor anal, secreción rectal y tenesmo. Sexo anal receptivo sin preservativo.", [NAAT, "RPR/VDRL"]],
    ["Dolor de cabeza que comenzó de golpe con máxima intensidad en segundos.", ["TC de cerebro"]],
  ];
  for (const [text, expected] of cases) {
    const original = proposal(text, "Evaluación inicial por síntomas", [], "no_tests");
    const corrected = applyDirectedExamProtocols(original, [{ id: "initial", text }]);
    assert.deepEqual(corrected.candidate_tests.map(candidate => candidate.test), expected);
    const final = run(corrected);
    assert.deepEqual(final.accepted_tests.map(test => test.name), expected);
    assert.equal(original.candidate_tests.length, 0, "No muta entrada original");
  }
});
test("protocolos no convierten negaciones, preguntas ni un sí ambiguo en indicaciones", () => {
  for (const text of [
    "No tengo disuria, polaquiuria ni fiebre.",
    "Dolor anal sin secreción rectal ni tenesmo. Sin sexo anal receptivo.",
    "No tengo cefalea, no comenzó de golpe ni alcanzó máxima intensidad en segundos.",
  ]) {
    const original = proposal(text, "Evaluación inicial por síntomas", [], "no_tests");
    assert.equal(applyDirectedExamProtocols(original, [{ id: "initial", text }]).candidate_tests.length, 0);
  }
  const original = proposal("Molestia aún sin caracterizar", "Evaluación inicial por síntomas", [], "no_tests");
  assert.equal(applyDirectedExamProtocols(original, [{ id: "q_0", text: "Sí", question: "¿Disuria y polaquiuria con fiebre?" }]).candidate_tests.length, 0);
});
test("bloqueo anatómico sobrevive a dos respuestas de IA equivocadas", () => {
  const assessment = proposal("Dolor anal continuo, fiebre y bulto perianal.", "Absceso perianal", ["Ecografía abdominal", "Urocultivo", ...unrelated]);
  assert.equal(run(assessment).accepted_tests.length, 0);
  const rectal = proposal("Dolor anal y secreción tras sexo anal receptivo.", "Proctitis", [NAAT]);
  for (const specimen of ["Orina", "Secreción vaginal", "Hisopado rectal o muestra vaginal"]) {
    rectal.candidate_tests[0].specimen_or_anatomy = specimen;
    assert.equal(run(rectal).accepted_tests.length, 0);
  }
});
