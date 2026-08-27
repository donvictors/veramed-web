import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("PDFs nuevos usan el Blob Store privado", () => {
  for (const path of [
    "lib/server/order-pdf-assets.ts",
    "lib/server/symptoms-order-pdf-assets.ts",
  ]) {
    const source = read(path);
    assert.match(source, /access: "private"/);
    assert.match(source, /PRIVATE_BLOB_READ_WRITE_TOKEN/);
    assert.doesNotMatch(source, /access: "public"/);
  }
});

test("la firma médica ya no está publicada como activo estático", () => {
  assert.equal(
    existsSync(new URL("../public/firmas/firma-VRM.png", import.meta.url)),
    false,
  );
  const signatureRoute = read("app/api/orders/signature/route.ts");
  assert.match(signatureRoute, /authorizeOrderRequest/);
  assert.match(signatureRoute, /getApprovedMedicalSigner/);
});

test("los enlaces PDF están limitados a siete días y son revocables", () => {
  const source = read("lib/server/order-pdf-access.ts");
  assert.match(source, /7 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(source, /revokePdfAccessLinks/);
  assert.match(source, /orderPdfAccessLog\.create/);
});

test("las páginas cliente no importan definiciones privadas de descuento", () => {
  for (const path of [
    "app/chequeo/pago/page.tsx",
    "app/control-cronico/pago/page.tsx",
    "app/sintomas/pago/page.tsx",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /server\/discount-codes/);
    assert.match(source, /validateDiscountCode/);
  }
});

test("las sesiones se guardan como hash y el portal médico usa sesiones revocables", () => {
  const patientAuth = read("lib/server/auth-store.ts");
  const medicalAuth = read("lib/server/medical-portal-auth.ts");
  assert.match(patientAuth, /hashOpaqueToken\(rawToken\)/);
  assert.match(medicalAuth, /medicalPortalSession\.create/);
  assert.match(medicalAuth, /revokeMedicalPortalSession/);
  assert.doesNotMatch(medicalAuth, /test123/);
  assert.doesNotMatch(medicalAuth, /veramed-medicos-dev-secret/);
});

test("las lecturas de órdenes no aprueban ni envían correos", () => {
  for (const path of [
    "lib/server/checkup-store.ts",
    "lib/server/chronic-control-store.ts",
  ]) {
    const source = read(path);
    const getter = source.slice(source.indexOf("export async function get"), source.indexOf("export async function create", source.indexOf("export async function get")));
    assert.doesNotMatch(getter, /reviewStatus:\s*"approved"/);
    assert.doesNotMatch(getter, /sendApprovedOrderEmail/);
    assert.match(source, /enqueueOrderApproved/);
  }
});

test("síntomas exige consentimiento y limita los datos enviados a IA", () => {
  const schema = read("lib/server/request-schemas.ts");
  const route = read("app/api/sintomas/interpret/route.ts");
  const client = read("app/sintomas/page.tsx");
  assert.match(schema, /consentToAiProcessing:\s*z\.literal\(true\)/);
  assert.match(schema, /symptomsText:\s*trimmed\(12,\s*4_000\)/);
  assert.match(route, /symptoms:interpret/);
  assert.match(client, /No se envían mi nombre, RUT ni/);
});

test("las rutas críticas cuentan con protección de origen, tamaño y rate limit", () => {
  const security = read("lib/server/http-security.ts");
  assert.match(security, /requireSameOrigin/);
  assert.match(security, /readJsonBody/);
  assert.match(security, /rateLimitBucket\.upsert/);
  for (const path of [
    "app/api/auth/login/route.ts",
    "app/api/payments/transbank/create/route.ts",
    "app/api/sintomas/payments/create/route.ts",
  ]) {
    const source = read(path);
    assert.match(source, /enforceRateLimit/);
    assert.match(source, /requireSameOrigin/);
  }
});
