import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-typescript.mjs";

const { PHONE_COUNTRIES, composePhoneValue, parsePhoneValue } = loadModule("lib/phone.ts");

test("Chile aparece primero y es el país predeterminado", () => {
  assert.equal(PHONE_COUNTRIES[0].iso2, "CL");
  assert.equal(PHONE_COUNTRIES[0].callingCode, "+56");
  assert.equal(PHONE_COUNTRIES[0].example, "912345678");
  assert.equal(parsePhoneValue("").country.iso2, "CL");
});

test("separa números guardados con código de país", () => {
  const chile = parsePhoneValue("+56 9 1234 5678");
  assert.equal(chile.country.iso2, "CL");
  assert.equal(chile.nationalNumber, "912345678");

  const colombia = parsePhoneValue("+57 312 345 6789");
  assert.equal(colombia.country.iso2, "CO");
  assert.equal(colombia.nationalNumber, "3123456789");
});

test("normaliza el valor enviado al backend", () => {
  const chile = PHONE_COUNTRIES[0];
  assert.equal(composePhoneValue(chile, "9 1234-5678"), "+56912345678");
  assert.equal(composePhoneValue(chile, ""), "");
});
