import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/load-typescript.mjs";

const {
  CONDITION_OPTIONS,
  MEDICATION_OPTIONS,
  conditionLabel,
  conditionUsesDiagnosisDuration,
  getChronicControlTotalPrice,
  recommendChronicControl,
  recommendMultipleChronicControls,
} = loadModule("lib/chronic-control.ts");
const { recommend } = loadModule("lib/checkup.ts");
const { createChronicControlSchema } = loadModule("lib/server/request-schemas.ts");

const NEW_CONDITIONS = [
  "chronic_hiv",
  "type1_diabetes",
  "prediabetes",
  "hyperthyroidism",
  "gout",
  "ibd",
  "celiac_disease",
  "bariatric_surgery",
  "pcos",
  "anemia_iron_deficiency",
  "spondyloarthritis_psoriatic_arthritis",
];

function examNames(condition) {
  return recommendChronicControl(condition, false).tests.map((item) => item.name);
}

function assertIncludes(actual, expected) {
  for (const exam of expected) {
    assert.equal(actual.includes(exam), true, `Debe incluir ${exam}`);
  }
}

function assertExcludes(actual, excluded) {
  for (const exam of excluded) {
    assert.equal(actual.includes(exam), false, `No debe incluir ${exam}`);
  }
}

function countExam(tests, name) {
  return tests.filter((item) => item.name === name).length;
}

test("las nuevas condiciones están disponibles con sus etiquetas públicas", () => {
  for (const condition of NEW_CONDITIONS) assert.equal(CONDITION_OPTIONS.includes(condition), true);
  assert.equal(conditionLabel("chronic_hiv"), "VIH");
  assert.equal(conditionLabel("type1_diabetes"), "Diabetes mellitus tipo 1");
  assert.equal(conditionLabel("ibd"), "Enfermedad inflamatoria intestinal (Crohn / colitis ulcerosa)");
});

test("DM1, prediabetes y cirugía bariátrica no solicitan duración diagnóstica", () => {
  for (const condition of ["type1_diabetes", "prediabetes", "bariatric_surgery"]) {
    assert.equal(conditionUsesDiagnosisDuration(condition), false);
  }
  assert.equal(conditionUsesDiagnosisDuration("hypertension"), true);
});

test("1: VIH genera seguimiento virológico, inmunológico, hematológico, renal y hepático", () => {
  assertIncludes(examNames("chronic_hiv"), [
    "Carga viral VIH",
    "Cuantificación de subpoblaciones de linfocitos T (CD3, CD4, CD8)",
    "Hemograma",
    "Creatinina en sangre",
    "Perfil hepático",
  ]);
});

test("2: diabetes mellitus tipo 1 genera el set solicitado", () => {
  assertIncludes(examNames("type1_diabetes"), [
    "Hemoglobina glicosilada (HbA1C)",
    "Perfil lipídico",
    "Creatinina en sangre",
    "Razón albuminuria / creatininuria (RAC)",
    "TSH",
    "Fondo de ojo",
  ]);
});

test("3: prediabetes no agrega PTGO", () => {
  const actual = examNames("prediabetes");
  assertIncludes(actual, [
    "Hemoglobina glicosilada (HbA1C)",
    "Glucosa en sangre",
    "Perfil lipídico",
    "Perfil hepático",
  ]);
  assertExcludes(actual, ["Prueba de tolerancia a la glucosa oral (PTGO)"]);
});

test("4: hipertiroidismo / Graves genera sólo TSH, T4 libre y T3", () => {
  assert.deepEqual(examNames("hyperthyroidism"), ["TSH", "T4 libre", "T3"]);
});

test("5: gota / hiperuricemia genera el set solicitado", () => {
  assertIncludes(examNames("gout"), ["Ácido úrico", "Creatinina en sangre", "Hemograma", "Perfil hepático"]);
});

test("6: enfermedad inflamatoria intestinal genera el set amplio solicitado", () => {
  assertIncludes(examNames("ibd"), [
    "Hemograma",
    "Proteína C reactiva (PCR)",
    "Creatinina en sangre",
    "Perfil hepático",
    "Albúmina",
    "Ferritina",
    "Cinética de fierro",
    "Calprotectina fecal cuantitativa",
  ]);
});

test("7: celiaquía controla nutrición sin serología ni folato", () => {
  const actual = examNames("celiac_disease");
  assertIncludes(actual, [
    "Hemograma",
    "Ferritina",
    "Cinética de fierro",
    "Niveles de vitamina B12",
    "Niveles de vitamina D",
    "Perfil hepático",
  ]);
  assertExcludes(actual, ["Anti-transglutaminasa IgA", "IgA total", "Folato sérico"]);
});

test("8: cirugía bariátrica genera seguimiento amplio sin folato", () => {
  const actual = examNames("bariatric_surgery");
  assertIncludes(actual, [
    "Hemograma",
    "Ferritina",
    "Cinética de fierro",
    "Niveles de vitamina B12",
    "Calcio total",
    "Niveles de vitamina D",
    "PTH",
    "Albúmina",
  ]);
  assertExcludes(actual, ["Folato sérico"]);
});

test("9: SOP genera seguimiento metabólico sin panel hormonal", () => {
  const actual = examNames("pcos");
  assertIncludes(actual, [
    "Hemoglobina glicosilada (HbA1C)",
    "Glucosa en sangre",
    "Perfil lipídico",
    "Perfil hepático",
  ]);
  assertExcludes(actual, [
    "Testosterona total",
    "SHBG",
    "LH",
    "FSH",
    "Prolactina",
    "17-OH-progesterona",
    "Insulina",
  ]);
});

test("10: anemia o ferropenia conocida no agrega folato ni estudio de hemólisis", () => {
  const actual = examNames("anemia_iron_deficiency");
  assertIncludes(actual, ["Hemograma", "Ferritina", "Cinética de fierro", "Niveles de vitamina B12"]);
  assertExcludes(actual, ["Folato sérico", "Recuento de reticulocitos", "LDH", "Haptoglobina"]);
});

test("11: espondiloartritis / artritis psoriática genera el set solicitado", () => {
  const actual = examNames("spondyloarthritis_psoriatic_arthritis");
  assertIncludes(actual, ["Hemograma", "Proteína C reactiva (PCR)", "Creatinina en sangre", "Perfil hepático"]);
  assertExcludes(actual, ["HLA-B27"]);
});

test("12: DM1 + HTA deduplica creatinina, RAC y perfil lipídico", () => {
  const rec = recommendMultipleChronicControls(
    ["type1_diabetes", "hypertension"],
    false,
    false,
    [],
  );
  for (const exam of ["Creatinina en sangre", "Razón albuminuria / creatininuria (RAC)", "Perfil lipídico"]) {
    assert.equal(countExam(rec.tests, exam), 1, `${exam} debe aparecer una sola vez`);
  }
});

test("13: EII + inmunosupresor reutiliza reglas farmacológicas sin duplicar", () => {
  const rec = recommendMultipleChronicControls(["ibd"], false, true, ["immunosuppressants"]);
  for (const exam of ["Hemograma", "Creatinina en sangre", "Perfil hepático"]) {
    assert.equal(countExam(rec.tests, exam), 1, `${exam} debe aparecer una sola vez`);
  }
  const hemogramReason = rec.tests.find((item) => item.name === "Hemograma").why;
  assert.match(hemogramReason, /enfermedad inflamatoria intestinal/i);
  assert.match(hemogramReason, /tratamiento inmunosupresor/i);
});

test("14: ninguna condición nueva genera automáticamente un examen de folato", () => {
  for (const condition of NEW_CONDITIONS) {
    const generated = examNames(condition).filter((name) => /folato|ácido fólico/i.test(name));
    assert.deepEqual(generated, [], `${condition} no debe generar folato`);
  }
});

test("la combinación completa de condiciones, medicamentos y dietas tampoco genera folato", () => {
  const rec = recommendMultipleChronicControls(
    CONDITION_OPTIONS,
    false,
    true,
    MEDICATION_OPTIONS,
    ["valproic_acid", "carbamazepine", "phenytoin", "phenobarbital", "other"],
    {
      age: 31,
      sex: "F",
      weightKg: 65,
      heightCm: 165,
      smoking: "never",
      stiScreening: "no",
      pregnancy: "no",
      dietaryRestriction: "special",
      dietaryPatterns: ["vegan", "vegetarian", "ketogenic", "gluten_free"],
    },
  );
  assert.equal(rec.tests.some((item) => /folato|ácido fólico/i.test(item.name)), false);
});

test("15: dieta libre de gluten conserva sus otros exámenes y deja de agregar folato", () => {
  const rec = recommend({
    age: 31,
    sex: "M",
    weightKg: 75,
    heightCm: 175,
    smoking: "never",
    stiScreening: "no",
    pregnancy: "no",
    dietaryRestriction: "special",
    dietaryPatterns: ["gluten_free"],
  });
  const actual = rec.tests.map((item) => item.name);
  assertIncludes(actual, ["Ferritina", "Cinética de fierro", "Hemograma"]);
  assert.equal(actual.some((name) => /folato|ácido fólico/i.test(name)), false);
});

test("el schema del servidor acepta IDs nuevos y rechaza condiciones arbitrarias", () => {
  const basePayload = {
    conditions: ["type1_diabetes", "ibd", "chronic_hiv"],
    patient: {
      fullName: "Paciente Prueba",
      rut: "11111111-1",
      birthDate: "1995-01-01",
      email: "paciente@example.com",
      phone: "+56911111111",
      address: "Santiago",
    },
    yearsSinceDiagnosis: 3,
    hasRecentChanges: false,
    usesMedication: false,
    selectedMedications: [],
  };
  assert.equal(createChronicControlSchema.safeParse(basePayload).success, true);
  assert.equal(
    createChronicControlSchema.safeParse({ ...basePayload, conditions: ["condition_not_allowed"] }).success,
    false,
  );
});

test("agregar exámenes preventivos no aumenta el precio del control crónico", () => {
  const rec = recommendMultipleChronicControls(
    ["hypertension"],
    false,
    false,
    [],
    [],
    {
      age: 40,
      sex: "M",
      weightKg: 75,
      heightCm: 175,
      smoking: "never",
      pregnancy: "no",
    },
  );
  assert.equal(getChronicControlTotalPrice(rec), 3990);
  assert.match(rec.notes.join(" "), /exámenes preventivos adicionales/i);
  assert.doesNotMatch(rec.notes.join(" "), /\$1\.000/);
});

test("el servidor recalcula el set desde condiciones válidas antes de guardar", async () => {
  let saved;
  const prisma = {
    chronicControlRequest: {
      create: async ({ data }) => {
        saved = data;
        const now = new Date("2026-09-13T12:00:00.000Z");
        return {
          ...data,
          createdAt: now,
          updatedAt: now,
          reviewStatus: "queued",
          queuedAt: null,
          approvedAt: null,
          approvedByName: null,
          approvedByRut: null,
          approvedBySis: null,
          approvedByEmail: null,
          approvalMethod: null,
          approvalProtocolVersion: null,
          rejectedAt: null,
          orderId: null,
          payment: null,
        };
      },
    },
  };
  const store = loadModule("lib/server/chronic-control-store.ts", {
    "@/lib/prisma": { prisma },
    "@/lib/server/medical-approval": { getAutomaticApprovalAttribution: () => ({}) },
    "@/lib/server/order-workflow": {
      enqueueOrderApproved: async () => {},
      processOrderOutbox: async () => {},
    },
  });

  await store.createChronicControlRecord({
    conditions: ["type1_diabetes"],
    patient: {
      fullName: "Paciente Prueba",
      rut: "11111111-1",
      birthDate: "1995-01-01",
      email: "paciente@example.com",
      phone: "+56911111111",
      address: "Santiago",
    },
    yearsSinceDiagnosis: 3,
    hasRecentChanges: false,
    usesMedication: false,
    selectedMedications: [],
  });

  assertIncludes(saved.rec.tests.map((item) => item.name), [
    "Hemoglobina glicosilada (HbA1C)",
    "Razón albuminuria / creatininuria (RAC)",
    "Fondo de ojo",
  ]);
});
