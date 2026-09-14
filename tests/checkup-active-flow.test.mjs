import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/load-typescript.mjs";

const { recommend } = loadModule("lib/checkup.ts");
const {
  countCheckupSelection,
  formatCheckupSelectionSummary,
} = loadModule("lib/order-categories.ts");
const { createCheckupSchema } = loadModule("lib/server/request-schemas.ts");

const MAPA = "Holter de presión arterial (MAPA)";
const VIH = "ELISA para VIH";
const VDRL = "RPR/VDRL";
const HBSAG = "Antígeno de superficie Virus Hepatitis B (HBsAg)";
const VHC = "Anticuerpos anti Virus Hepatitis C";
const CT_NG = "PCR Chlamydia trachomatis y Neisseria gonorrhoeae";
const AAA = "Ecografía abdominal";
const OPTIONAL_TESTS = [
  "Hemograma",
  "Creatinina en sangre",
  "Perfil bioquímico",
  "Niveles de vitamina D",
];

function makeInput(overrides = {}) {
  return {
    age: 31,
    sex: "M",
    weightKg: 75,
    heightCm: 175,
    smoking: "never",
    stiScreening: "no",
    pregnancy: "no",
    dietaryRestriction: "none",
    dietaryPatterns: [],
    ...overrides,
  };
}

function names(input) {
  return new Set(recommend(input).tests.map((item) => item.name));
}

function expectIncluded(actual, expected) {
  for (const exam of expected) assert.equal(actual.has(exam), true, `Debe incluir ${exam}`);
}

function expectExcluded(actual, expected) {
  for (const exam of expected) assert.equal(actual.has(exam), false, `No debe incluir ${exam}`);
}

test("A: hombre de 31 años sin chequeo ITS mantiene VIH universal y MAPA", () => {
  const actual = names(makeInput());
  expectIncluded(actual, [VIH, MAPA]);
  expectExcluded(actual, [VDRL, HBSAG, VHC, CT_NG]);
});

test("B: hombre de 31 años con chequeo ITS agrega el panel definido, sin CT/NG", () => {
  const actual = names(makeInput({ stiScreening: "yes" }));
  expectIncluded(actual, [VIH, VDRL, HBSAG, VHC, MAPA]);
  expectExcluded(actual, [CT_NG]);
});

test("C: mujer de 22 años con chequeo ITS agrega CT/NG", () => {
  const actual = names(makeInput({ age: 22, sex: "F", stiScreening: "yes" }));
  expectIncluded(actual, [VIH, VDRL, HBSAG, VHC, CT_NG, MAPA]);
});

test("D: mujer de 35 años depende de stiScreening y no de sexualActivity", () => {
  const selected = names(
    makeInput({ sex: "F", age: 35, stiScreening: "yes", sexualActivity: "no" }),
  );
  expectIncluded(selected, [VIH, VDRL, HBSAG, VHC, CT_NG]);

  const declined = names(
    makeInput({ sex: "F", age: 35, stiScreening: "no", sexualActivity: "yes" }),
  );
  expectExcluded(declined, [VDRL, HBSAG, VHC, CT_NG]);
});

test("E: embarazo sin chequeo ITS conserva CT/NG y reglas preventivas vigentes", () => {
  const actual = names(
    makeInput({ sex: "F", age: 30, stiScreening: "no", pregnancy: "yes", gestationWeeks: 12 }),
  );
  expectIncluded(actual, [VIH, HBSAG, CT_NG, "Orina completa", "Urocultivo"]);
  expectExcluded(actual, [VDRL, VHC]);
});

test("F-H: AAA sólo se agrega a hombres de 65–75 años fumadores o exfumadores", () => {
  assert.equal(names(makeInput({ age: 68, smoking: "former" })).has(AAA), true);
  assert.equal(names(makeInput({ age: 68, sex: "F", smoking: "former" })).has(AAA), false);
  assert.equal(names(makeInput({ age: 68, smoking: "never" })).has(AAA), false);
});

test("compatibilidad: solicitudes antiguas con sexualActivity se siguen leyendo", () => {
  const legacy = makeInput({ sexualActivity: "yes" });
  delete legacy.stiScreening;
  expectIncluded(names(legacy), [VDRL, HBSAG, VHC]);
});

test("el schema acepta payloads actuales y legacy, y rechaza recomendaciones del cliente", () => {
  const patient = {
    fullName: "Paciente Prueba",
    rut: "11111111-1",
    birthDate: "1995-01-01",
    email: "paciente@example.com",
    phone: "+56911111111",
    address: "Santiago",
  };
  assert.equal(createCheckupSchema.safeParse({ input: makeInput(), patient }).success, true);

  const legacy = makeInput({ sexualActivity: "yes" });
  delete legacy.stiScreening;
  assert.equal(createCheckupSchema.safeParse({ input: legacy, patient }).success, true);
  assert.equal(
    createCheckupSchema.safeParse({ input: makeInput(), patient, rec: { tests: [] } }).success,
    false,
  );
});

function makeStoredRow(input = makeInput()) {
  const now = new Date("2026-09-13T12:00:00.000Z");
  return {
    id: "chk_test",
    userId: null,
    createdAt: now,
    updatedAt: now,
    input,
    patientFirstName: "Paciente",
    patientPaternalSurname: "Prueba",
    patientMaternalSurname: "",
    patientRut: "11111111-1",
    patientBirthDate: "1995-01-01",
    patientEmail: "paciente@example.com",
    patientPhone: "+56911111111",
    patientAddress: "Santiago",
    rec: recommend(input),
    reviewStatus: "queued",
    queuedAt: now,
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
}

function loadStoreWithRow(initialRow) {
  let row = structuredClone(initialRow);
  const prisma = {
    checkupRequest: {
      findUnique: async () => structuredClone(row),
      update: async ({ data }) => {
        row = { ...row, ...data, updatedAt: new Date() };
        return structuredClone(row);
      },
    },
  };
  const store = loadModule("lib/server/checkup-store.ts", {
    "@/lib/prisma": { prisma },
    "@/lib/server/medical-approval": { getAutomaticApprovalAttribution: () => ({}) },
    "@/lib/server/order-workflow": {
      enqueueOrderApproved: async () => {},
      processOrderOutbox: async () => {},
    },
  });
  return { store, getRow: () => row };
}

test("el servidor recalcula la recomendación al crear y no guarda una enviada por el cliente", async () => {
  const input = makeInput({ stiScreening: "yes" });
  let savedData;
  const prisma = {
    checkupRequest: {
      create: async ({ data }) => {
        savedData = data;
        const now = new Date("2026-09-13T12:00:00.000Z");
        return {
          ...makeStoredRow(input),
          ...data,
          createdAt: now,
          updatedAt: now,
        };
      },
    },
  };
  const store = loadModule("lib/server/checkup-store.ts", {
    "@/lib/prisma": { prisma },
    "@/lib/server/medical-approval": { getAutomaticApprovalAttribution: () => ({}) },
    "@/lib/server/order-workflow": {
      enqueueOrderApproved: async () => {},
      processOrderOutbox: async () => {},
    },
  });

  await store.createCheckupRecord({
    input,
    patient: {
      fullName: "Paciente Prueba",
      rut: "11111111-1",
      birthDate: "1995-01-01",
      email: "paciente@example.com",
      phone: "+56911111111",
      address: "Santiago",
    },
  });

  expectIncluded(new Set(savedData.rec.tests.map((item) => item.name)), [VIH, VDRL, HBSAG, VHC]);
});

test("I: excluir MAPA persiste en servidor y actualiza el conteo usado por el resumen", async () => {
  const initial = makeStoredRow();
  const { store } = loadStoreWithRow(initial);
  const before = countCheckupSelection(initial.rec.tests);
  const updated = await store.updateCheckupScreeningPreferences("chk_test", {
    bloodPressureMethod: "skip",
  });
  const after = countCheckupSelection(updated.rec.tests);

  assert.equal(initial.rec.tests.some((item) => item.name === MAPA), true);
  assert.equal(updated.rec.tests.some((item) => item.name === MAPA), false);
  assert.equal(after.procedure, before.procedure - 1);
});

test("J: agregar y quitar los cuatro exámenes opcionales actualiza la selección", async () => {
  const initial = makeStoredRow();
  const { store } = loadStoreWithRow(initial);
  const originalCount = countCheckupSelection(initial.rec.tests).laboratory;
  let updated;

  for (const addTestName of OPTIONAL_TESTS) {
    updated = await store.updateCheckupScreeningPreferences("chk_test", { addTestName });
  }
  assert.equal(countCheckupSelection(updated.rec.tests).laboratory, originalCount + 4);
  for (const exam of OPTIONAL_TESTS) {
    assert.equal(updated.rec.tests.some((item) => item.name === exam), true);
  }

  for (const removeTestName of OPTIONAL_TESTS) {
    updated = await store.updateCheckupScreeningPreferences("chk_test", { removeTestName });
  }
  assert.equal(countCheckupSelection(updated.rec.tests).laboratory, originalCount);
  for (const exam of OPTIONAL_TESTS) {
    assert.equal(updated.rec.tests.some((item) => item.name === exam), false);
  }
});

test("K: el resumen usa singular, plural y oculta categorías vacías", () => {
  assert.equal(
    formatCheckupSelectionSummary({ laboratory: 1, image: 1, procedure: 1 }),
    "1 examen de laboratorio · 1 examen de imagen · 1 procedimiento",
  );
  assert.equal(
    formatCheckupSelectionSummary({ laboratory: 2, image: 2, procedure: 2 }),
    "2 exámenes de laboratorio · 2 exámenes de imagen · 2 procedimientos",
  );
  assert.equal(
    formatCheckupSelectionSummary({ laboratory: 0, image: 2, procedure: 0 }),
    "2 exámenes de imagen",
  );
});
