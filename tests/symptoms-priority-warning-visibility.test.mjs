import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("el correo omite la caja de orientación presencial prioritaria", () => {
  const email = source("lib/server/symptoms-order-email.ts");

  assert.match(email, /decision\.care_level !== "presencial_priority"/);
});

test("la orden impresa reserva la caja de advertencia para emergencias", () => {
  const order = source("app/sintomas/orden/page.tsx");

  assert.doesNotMatch(
    order,
    /Busca evaluación presencial prioritaria\. No retrases la consulta esperando los exámenes ni sus resultados\./,
  );
  assert.match(order, /order\.careDecision\?\.care_level === "emergency"/);
});
