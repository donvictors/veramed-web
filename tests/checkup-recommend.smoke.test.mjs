import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCheckupPreventiveRecommendation,
  validateCheckupPreventiveInput
} from "../lib/server/checkup-preventive-recommendation-engine.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const snapshotPath = path.join(__dirname, "__snapshots__/checkup-recommend.snapshots.json");
const snapshots = JSON.parse(readFileSync(snapshotPath, "utf8"));

test("smoke: validación básica de payload inválido", () => {
  const result = validateCheckupPreventiveInput({
    age: 14,
    sex: "Unknown"
  });

  assert.equal(result.ok, false);
  assert.ok(Array.isArray(result.errors));
  assert.ok(result.errors.length >= 2);
});

for (const scenario of snapshots.cases) {
  test(`smoke: ${scenario.name}`, () => {
    const validation = validateCheckupPreventiveInput(scenario.input);

    assert.equal(validation.ok, true);
    const response = buildCheckupPreventiveRecommendation(validation.value);

    assert.deepEqual(response, scenario.expected);
  });
}
