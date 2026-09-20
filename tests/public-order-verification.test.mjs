import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadModule } from "./helpers/load-typescript.mjs";

test("el encabezado ya no ofrece el CTA del portal médico", () => {
  const header = readFileSync("components/Header.tsx", "utf8");
  assert.doesNotMatch(header, /Portal Médicos/);
  assert.doesNotMatch(header, /href="\/medicos-login"/);
});

test("el footer enlaza el verificador entre portal médico y contacto", () => {
  const footer = readFileSync("components/Footer.tsx", "utf8");
  const portal = footer.indexOf("Portal médico");
  const verifier = footer.indexOf("Verificar orden");
  const contact = footer.indexOf("Contacto");
  assert.ok(portal >= 0 && verifier > portal && contact > verifier);
  assert.match(footer, /href="\/verificar-orden"/);
});

test("el correo no repite la introducción a los enlaces PDF", () => {
  for (const file of ["app/api/send-email/route.ts", "lib/server/order-ready-email.ts"]) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /abrirlos en PDF aquí/);
    assert.equal((source.match(/Puedes revisar tus órdenes validadas en tu cuenta o abrirlas en PDF:/g) ?? []).length, 1);
  }
});

test("el formulario crónico usa la pregunta preventiva y no envía la propiedad rechazada", () => {
  const page = readFileSync("app/control-cronico/page.tsx", "utf8");
  const submitBlock = page.slice(page.indexOf("createChronicControlRequest({"), page.indexOf("router.push", page.indexOf("createChronicControlRequest({")));
  assert.match(page, /¿Quieres agregar el resto de exámenes preventivos según tu perfil\?/);
  assert.doesNotMatch(page, /\+\$1\.000/);
  assert.doesNotMatch(submitBlock, /includeGeneralCheckup,/);
});

test("el verificador normaliza el código y distingue recetas vigentes y revocadas", async () => {
  const rows = new Map([
    ["RX-20260920-VALIDA", {
      verificationCode: "RX-20260920-VALIDA",
      status: "sent",
      revokedAt: null,
      signedAt: new Date("2026-09-20T12:00:00.000Z"),
      prescriberName: "Dra. Veramed",
      prescriberSpecialty: "Medicina general",
      items: [{ name: "Medicamento" }],
    }],
    ["RX-20260920-REVOCADA", {
      verificationCode: "RX-20260920-REVOCADA",
      status: "revoked",
      revokedAt: new Date("2026-09-21T12:00:00.000Z"),
      signedAt: new Date("2026-09-20T12:00:00.000Z"),
      prescriberName: "Dra. Veramed",
      prescriberSpecialty: "",
      items: [],
    }],
  ]);
  const prisma = {
    medicalPrescription: {
      findUnique: async ({ where }) => rows.get(where.verificationCode) ?? null,
    },
  };
  const verifier = loadModule("lib/server/order-verification.ts", {
    "@/lib/prisma": { prisma },
  });

  assert.equal(verifier.normalizeVerificationCode(" rx-20260920-valida "), "RX-20260920-VALIDA");
  assert.equal((await verifier.verifyMedicalOrderCode("rx-20260920-valida")).valid, true);
  assert.equal((await verifier.verifyMedicalOrderCode("RX-20260920-REVOCADA")).status, "Revocada");
  assert.deepEqual(await verifier.verifyMedicalOrderCode("código falso"), {
    found: false,
    valid: false,
    code: "CÓDIGOFALSO",
  });
});
