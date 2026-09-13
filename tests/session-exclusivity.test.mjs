import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("el acceso médico revoca y elimina la sesión de paciente", () => {
  const login = source("app/api/medicos-auth/login/route.ts");
  assert.match(login, /logoutSession\(cookieStore\.get\(AUTH_SESSION_COOKIE\)\?\.value\)/);
  assert.match(login, /cookieStore\.set\(AUTH_SESSION_COOKIE, ""/);
});

test("todos los accesos de paciente revocan y eliminan la sesión médica", () => {
  for (const path of [
    "app/api/auth/login/route.ts",
    "app/api/auth/register/route.ts",
    "app/api/auth/google/sync/route.ts",
  ]) {
    const login = source(path);
    assert.match(login, /revokeMedicalPortalSession/);
    assert.match(login, /cookieStore\.set\(MEDICAL_PORTAL_SESSION_COOKIE, ""/);
  }
});

test("el encabezado conserva el botón de usuario para una sesión médica", () => {
  const header = source("components/Header.tsx");
  assert.match(header, /session\.kind === "medical" \? "\/portal-medicos"/);
  assert.match(header, /<UserSessionMenu session=\{session\}/);
});
