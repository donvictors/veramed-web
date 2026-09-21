import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { loadModule } from "./helpers/load-typescript.mjs";

const catalog = loadModule("lib/exam-master-catalog.ts");
const { inferOrderDetails } = loadModule("lib/checkup.ts");

const expectedCodes = {
  "Aldosterona o aldosterona sérica": "0303002",
  "Anticuerpo anti-CCP": "0305099",
  "Anticuerpos anti-células parietales y anti-factor intrínseco por ELISA": "0305007, 0305007",
  "Antígeno de Helicobacter pylori en deposiciones": "0308063",
  Coprocultivo: "0306007",
  "Factor reumatoide (FR)": "0305020",
  Lipasa: "0302053",
  T3: "0303028",
  "Test de embarazo en sangre (hCG)": "0303014",
  "Test inmunológico de sangre oculta en deposiciones": "0308062",
  "Velocidad de eritrosedimentación (VHS/ESR)": "0301086",
  "Ecografía mamaria": "0404012",
  "Radiografía de tórax PA/L": "0401070",
  "TC de tórax de baja dosis": "0403013",
  "Colonoscopía total": "1801006",
  "Test de caminata en 6 minutos": "1707009",
  "RPR/VDRL": "0306038, 0306042",
};

test("el catálogo expone los códigos FONASA corregidos", () => {
  for (const [name, code] of Object.entries(expectedCodes)) {
    assert.equal(catalog.getExamFonasaCodeByName(name), code, name);
  }
});

test("los nombres históricos resuelven hacia las prestaciones renombradas", () => {
  assert.equal(
    catalog.getExamMetadataByName("Test de embarazo (hCG)")?.name,
    "Test de embarazo en sangre (hCG)",
  );
  assert.equal(
    catalog.getExamMetadataByName("Radiografía de tórax")?.name,
    "Radiografía de tórax PA/L",
  );
  assert.equal(
    catalog.getExamMetadataByClinicalExamId("pregnancy_test")?.name,
    "Test de embarazo en sangre (hCG)",
  );
  assert.equal(
    catalog.getExamMetadataByClinicalExamId("chest_xray")?.name,
    "Radiografía de tórax PA/L",
  );
});

test("cotesting se expande en dos líneas y deduplica PAP/VPH existentes", () => {
  const tests = catalog.expandExamItemsForOrder([
    { name: "Cotesting (PAP+VPH)", why: "Cotesting" },
    { name: "Papanicolau (PAP)", why: "Otra regla" },
    { name: "PCR de virus papiloma humano (VPH)", why: "Otra regla" },
  ]);
  assert.deepEqual(
    tests.map((item) => item.name),
    ["Papanicolau (PAP)", "PCR de virus papiloma humano (VPH)"],
  );
  assert.deepEqual(
    tests.map((item) => catalog.getExamFonasaCodeByName(item.name)),
    ["0801001", "0306123"],
  );
});

test("todas las vistas de orden y el fallback PDF aplican la expansión central", () => {
  for (const path of [
    "app/chequeo/orden/page.tsx",
    "app/control-cronico/orden/page.tsx",
    "app/sintomas/orden/page.tsx",
    "lib/server/order-pdf.ts",
  ]) {
    assert.match(readFileSync(path, "utf8"), /expandExamItemsForOrder/, path);
  }
  const fallbackPdf = readFileSync("lib/server/order-pdf.ts", "utf8");
  assert.match(fallbackPdf, /getExamFonasaCodeByName/);
  assert.match(fallbackPdf, /getExamObservationForOrder/);
});

test("las líneas de cada examen en los PDF sólo incluyen observaciones y códigos FONASA", () => {
  for (const path of [
    "app/chequeo/orden/page.tsx",
    "app/control-cronico/orden/page.tsx",
    "app/sintomas/orden/page.tsx",
  ]) {
    const source = readFileSync(path, "utf8");
    const bodyExams = source.slice(
      source.indexOf("function BodyExams"),
      source.indexOf("function chunkTestsForPrint"),
    );
    assert.match(bodyExams, /Observaciones:/, path);
    assert.match(bodyExams, /Códigos FONASA:/, path);
    assert.doesNotMatch(bodyExams, /Indicación:|Fecha:/, path);
  }

  const fallbackPdf = readFileSync("lib/server/order-pdf.ts", "utf8");
  const examLoop = fallbackPdf.slice(
    fallbackPdf.indexOf("for (const test of tests)"),
    fallbackPdf.indexOf("const totalPages"),
  );
  assert.match(examLoop, /Observaciones:/);
  assert.match(examLoop, /Códigos FONASA:/);
  assert.doesNotMatch(examLoop, /Indicación:|Fecha:/);
});

test("ayunos obligatorios y recomendaciones permanecen diferenciados", () => {
  for (const name of [
    "Cinética de fierro",
    "Folato sérico",
    "Glucosa en sangre",
    "Niveles de vitamina B12",
    "Perfil bioquímico",
    "Perfil lipídico",
    "Prueba de tolerancia a la glucosa oral (PTGO)",
    "PTH",
  ]) {
    assert.equal(catalog.getExamMetadataByName(name)?.requiresFasting, true, name);
  }

  for (const name of [
    "Hemoglobina glicosilada (HbA1C)",
    "Perfil hepático",
    "Tiempo de protrombina (TP/INR)",
    "Tiempo de tromboplastina parcial activado (TTPA)",
    "Cuantificación de complemento C3",
    "Cuantificación de complemento C4",
    "Factor reumatoide (FR)",
    "Testosterona total",
  ]) {
    assert.equal(catalog.getExamMetadataByName(name)?.requiresFasting, false, name);
    assert.equal(inferOrderDetails([{ name, why: "test" }]).needsFasting, false, name);
  }

  assert.match(
    catalog.getExamObservationForOrder("Hemoglobina glicosilada (HbA1C)", {
      needsFasting: false,
    }),
    /^No requiere ayuno\./,
  );
  for (const name of [
    "Perfil hepático",
    "Tiempo de protrombina (TP/INR)",
    "Tiempo de tromboplastina parcial activado (TTPA)",
    "Cuantificación de complemento C3",
    "Cuantificación de complemento C4",
  ]) {
    assert.match(
      catalog.getExamObservationForOrder(name, { needsFasting: false }),
      /recomendable/i,
      name,
    );
  }
  assert.match(
    catalog.getExamObservationForOrder("Factor reumatoide (FR)", { needsFasting: false }),
    /^Preferentemente realizar en ayunas\./,
  );
  assert.equal(
    catalog.getExamObservationForOrder("TC de tórax de baja dosis", {
      needsFasting: false,
      category: "image",
    }),
    "Protocolo de baja dosis",
  );
});
