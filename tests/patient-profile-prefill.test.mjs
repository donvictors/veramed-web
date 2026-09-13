import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("los tres formularios consultan el perfil autenticado para precargar datos", async () => {
  const [symptoms, checkup, chronic] = await Promise.all([
    readSource("app/sintomas/page.tsx"),
    readSource("app/chequeo/page.tsx"),
    readSource("app/control-cronico/page.tsx"),
  ]);

  for (const source of [symptoms, checkup, chronic]) {
    assert.match(source, /fetchCurrentUser\(\)/);
    assert.match(source, /profile\.fullName/);
    assert.match(source, /profile\.birthDate/);
    assert.match(source, /profile\.email/);
    assert.match(source, /profile\.phone/);
    assert.match(source, /profile\.address/);
    assert.match(source, /profile\.sex/);
  }

  assert.match(symptoms, /setRutNormalized/);
  assert.match(symptoms, /profile\.sex === "F" \? "female"/);
  assert.match(checkup, /setSex\(response\.user\.profile\.sex\)/);
  assert.match(chronic, /setCheckupSex\(response\.user\.profile\.sex\)/);
});

test("el sexo queda almacenado únicamente en el perfil del servidor", async () => {
  const [schema, authStore, profileRoute] = await Promise.all([
    readSource("prisma/schema.prisma"),
    readSource("lib/server/auth-store.ts"),
    readSource("app/api/account/profile/route.ts"),
  ]);

  assert.match(schema, /profileSex\s+String\s+@default\(""\)/);
  assert.match(authStore, /profileSex: payload\.sex/);
  assert.match(profileRoute, /sex === "M" \|\| sex === "F"/);
});

