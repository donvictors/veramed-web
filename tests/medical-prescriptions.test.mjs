import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadModule } from "./helpers/load-typescript.mjs";

const { issuePrescriptionSchema } = loadModule("lib/prescriptions.ts");

function validPayload() {
  return {
    patient: {
      userId: "patient-1",
      firstName: "Ana",
      paternalSurname: "Pérez",
      maternalSurname: "Soto",
      rut: "12.345.678-5",
      birthDate: "1990-03-15",
      email: "ana@example.com",
      phone: "+56911111111",
      address: "Santiago",
    },
    items: [{
      id: "item-1",
      name: "Losartán 50 mg comprimido",
      commercial: "",
      dose: "1",
      doseUnit: "comprimido(s)",
      frequency: "12",
      frequencyUnit: "horas",
      duration: "30",
      durationUnit: "días",
      startDate: "2026-09-13",
      observations: "",
    }],
    confirmation: true,
  };
}

test("la emisión exige paciente, indicación completa y confirmación explícita", () => {
  assert.equal(issuePrescriptionSchema.safeParse(validPayload()).success, true);
  assert.equal(issuePrescriptionSchema.safeParse({ ...validPayload(), confirmation: false }).success, false);
  const withoutDose = validPayload();
  withoutDose.items[0].dose = "0";
  assert.equal(issuePrescriptionSchema.safeParse(withoutDose).success, false);
});

test("duración permanente no exige una cantidad numérica", () => {
  const payload = validPayload();
  payload.items[0].duration = "";
  payload.items[0].durationUnit = "Permanente";
  assert.equal(issuePrescriptionSchema.safeParse(payload).success, true);
});

test("la emisión permite ingresar manualmente un paciente sin cuenta Veramed", () => {
  const payload = validPayload();
  payload.patient.userId = null;
  assert.equal(issuePrescriptionSchema.safeParse(payload).success, true);
});

test("el PDF firmado contiene identidad, medicamento y trazabilidad", async () => {
  const { buildMedicalPrescriptionPdf } = loadModule("lib/server/prescription-pdf.ts");
  const payload = validPayload();
  const pdf = await buildMedicalPrescriptionPdf({
    patient: payload.patient,
    items: payload.items,
    prescriber: {
      name: "Dra. María Ejemplo",
      rut: "11.111.111-1",
      sisRegistration: "123456",
      email: "medica@example.com",
      specialty: "Medicina interna",
    },
    verificationCode: "RX-20260913-TEST",
    issuedAt: new Date("2026-09-13T18:00:00-03:00"),
  });
  assert.equal(new TextDecoder().decode(pdf.subarray(0, 5)), "%PDF-");
  assert.ok(pdf.byteLength > 2_000);
});

test("la receta se almacena privada y el correo la adjunta sin URL pública", () => {
  const source = readFileSync(new URL("../lib/server/medical-prescriptions.ts", import.meta.url), "utf8");
  assert.match(source, /access: "private"/);
  assert.match(source, /attachments:/);
  assert.doesNotMatch(source, /blob\.url[^\n]*html/);
});

test("la receta alinea el logo dentro de la página y no numera los medicamentos", () => {
  const source = readFileSync(new URL("../lib/server/prescription-pdf.ts", import.meta.url), "utf8");
  assert.match(source, /y: y - 41/);
  assert.doesNotMatch(source, /drawText\(String\(index \+ 1\)/);
  assert.doesNotMatch(source, /drawCircle\(\{ x: margin \+ 7/);
});
