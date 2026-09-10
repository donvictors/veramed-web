// Explicit opt-in evaluation: synthetic cases only, no DB, payments, PDFs or emails.
import assert from "node:assert/strict";
import nextEnv from "@next/env";
import { writeFileSync } from "node:fs";
import { loadModule } from "../tests/helpers/load-typescript.mjs";
import * as interview from "../lib/server/symptoms-interview-engine.mjs";
if (!process.argv.includes("--live")) throw new Error("Use --live para evaluar con el proveedor configurado; consume llamadas de API.");
nextEnv.loadEnvConfig(process.cwd());
const { suggestSymptomsExamsWithOpenAI } = loadModule("lib/server/symptoms-openai.ts", { "@/lib/server/symptoms-interview-engine.mjs": interview });
const { finalizeExamDecision } = loadModule("lib/symptoms-exam-assessment.ts");
const { EXAM_MASTER_CATALOG } = loadModule("lib/exam-master-catalog.ts");
const NAAT = "PCR Chlamydia trachomatis y Neisseria gonorrhoeae";
const unrelated = ["Anticuerpos anti Virus Hepatitis C", "Antígeno de superficie Virus Hepatitis B (HBsAg)", "Antígeno de Helicobacter pylori en deposiciones", "Dímero D", "Perfil hepático", "Ecografía abdominal"];
const scenarios = [
  { id: "fissure", text: "Desde hace dos días dolor anal leve solo durante la defecación y unas gotas de sangre roja al limpiarme tras deposiciones duras. Mejora al terminar. Sin fiebre, escalofríos, masa, secreción, diarrea, tenesmo, síntomas urinarios, pérdida de peso ni sangrado abundante. Primera vez. Sin diabetes, inmunosupresión ni enfermedad intestinal, sin contacto sexual anal reciente.", care: ["no_tests"], expected: [], forbidden: ["Hemograma", "Urocultivo", "Sangre oculta en deposiciones"], zero: true },
  { id: "abscess", text: "Dolor anal continuo y progresivo desde hace tres días, fiebre medida 39 grados y bulto doloroso al lado del ano. Puedo beber y caminar, sin confusión, desmayo, vómitos ni falta de aire. Sin secreción, sangrado, diarrea, tenesmo, síntomas urinarios ni contacto sexual anal. Sin diabetes ni inmunosupresión.", care: ["presencial_priority", "emergency"], expected: [], forbidden: ["Urocultivo", NAAT] },
  { id: "proctitis", text: "Dolor anal, secreción rectal amarilla y tenesmo desde hace cinco días. Sexo anal receptivo sin preservativo con pareja nueva hace dos semanas. Sin fiebre, escalofríos, bulto perianal, úlceras, sangrado abundante, diarrea o síntomas urinarios. Sin diabetes ni inmunosupresión, sin antecedentes de EII. Tolero líquidos y actividades.", care: ["outpatient_tests", "presencial_priority"], expected: [NAAT], forbidden: ["Urocultivo", "Orina completa"] },
  { id: "febrile_urinary", text: "Disuria y polaquiuria desde hace dos días con fiebre medida 38.3. Sin dolor en flancos, vómitos, confusión, desmayo, secreción genital ni exposición sexual reciente. Tolero líquidos y puedo hacer mis actividades. Sin enfermedades previas ni medicación, nunca tuve infecciones urinarias.", care: ["outpatient_tests", "presencial_priority"], expected: ["Orina completa", "Urocultivo"], forbidden: [NAAT] },
  { id: "typical_headache", text: "Migraña diagnosticada hace años. Hoy dolor de cabeza gradual igual a mis episodios habituales, intensidad moderada y mejorando con reposo. Sin fiebre, rigidez cervical, inicio explosivo, déficit focal, confusión, vómitos persistentes, traumatismo, cambio de patrón ni síntomas visuales nuevos. Sin inmunosupresión ni cáncer.", care: ["no_tests"], expected: [], forbidden: ["TC de cerebro", "RM de cerebro", "Hemograma"], zero: true },
  { id: "headache_red_flag", text: "El peor dolor de cabeza de mi vida, comenzó de golpe hace una hora y alcanzó máxima intensidad en segundos. Nunca había pasado. Sin traumatismo. No tengo otros antecedentes ni medicamentos.", care: ["emergency"], expected: [], forbidden: ["Urocultivo", "Orina completa"] },
  { id: "self_limited", text: "Molestia leve en músculos de ambas piernas después de hacer ejercicio ayer, completamente resuelta hoy. Sin debilidad, hinchazón, enrojecimiento, fiebre, orina oscura ni otros síntomas. Sin enfermedades ni medicamentos, actividad normal.", care: ["no_tests"], expected: [], forbidden: ["Hemograma", "Orina completa"], zero: true },
];
const results = [];
for (const scenario of scenarios) {
  const started = Date.now();
  const sources = [{ id: "initial", text: scenario.text }, { id: "patient_context", text: "Adulto de 35 años, sexo masculino." }];
  try {
    const generated = await suggestSymptomsExamsWithOpenAI({ sources });
    const decision = finalizeExamDecision({ ...generated, sources, catalogNames: EXAM_MASTER_CATALOG.map(exam => exam.name) });
    const names = decision.accepted_tests.map(test => test.name);
    const failures = [];
    if (!generated.audit || decision.status !== "audited") failures.push("Falta evaluación/auditoría satisfactoria");
    if (!scenario.care.includes(decision.care_level)) failures.push(`Nivel inesperado: ${decision.care_level}`);
    if (scenario.zero && names.length) failures.push(`Esperaba cero: ${names.join(", ")}`);
    for (const exam of scenario.expected) if (!names.includes(exam)) failures.push(`Falta ${exam}`);
    for (const exam of [...scenario.forbidden, ...unrelated]) if (names.includes(exam)) failures.push(`No pertinente: ${exam}`);
    if (scenario.id === "proctitis" && !decision.accepted_tests.some(test => test.name === NAAT && /rectal/i.test(test.why))) failures.push("Falta muestra rectal");
    results.push({ id: scenario.id, elapsedMs: Date.now() - started, model: generated.model, failures, decision });
    console.log(JSON.stringify({ case: scenario.id, seconds: (Date.now() - started) / 1000, care: decision.care_level, tests: names, failures }));
  } catch (error) {
    results.push({ id: scenario.id, failures: [error instanceof Error ? error.name : "Error"] });
    console.log(JSON.stringify({ case: scenario.id, failed: results.at(-1).failures }));
  }
}
writeFileSync("/tmp/veramed-symptoms-exam-evaluation.json", JSON.stringify(results, null, 2));
assert.ok(results.every(result => result.failures.length === 0), "Hay regresiones; ver /tmp/veramed-symptoms-exam-evaluation.json");
