import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadModule } from "./helpers/load-typescript.mjs";

function loadHeaderSessionRoute({ patient = null, medical = null } = {}) {
  const cookieValues = {
    veramed_session: "patient-token",
    veramed_medicos_session: "medical-token",
  };

  return loadModule("app/api/auth/header-session/route.ts", {
    "next/server": {
      NextResponse: {
        json: (body, options) => ({ body, headers: options?.headers ?? {} }),
      },
    },
    "next/headers": {
      cookies: async () => ({
        get: (name) =>
          cookieValues[name] ? { value: cookieValues[name] } : undefined,
        set: (name, value) => {
          cookieValues[name] = value;
        },
      }),
    },
    "@/lib/auth": { AUTH_SESSION_COOKIE: "veramed_session" },
    "@/lib/server/auth-store": {
      getUserFromSession: async () => patient,
      logoutSession: async (token) => {
        cookieValues.loggedOutPatientToken = token;
      },
    },
    "@/lib/server/medical-portal-auth": {
      MEDICAL_PORTAL_SESSION_COOKIE: "veramed_medicos_session",
      verifyMedicalPortalSessionToken: async () => medical,
    },
  });
}

test("prioriza la sesión médica y elimina una sesión de paciente coexistente", async () => {
  const { GET } = loadHeaderSessionRoute({
    patient: {
      name: "Víctor Paciente",
      email: "victor@example.com",
      profile: { fullName: "Víctor Paciente", email: "victor@example.com" },
    },
    medical: {
      name: "Dr. Víctor Rebolledo",
      email: "victor@example.com",
    },
  });

  const response = await GET();

  assert.equal(response.body.session.kind, "medical");
  assert.equal(response.body.session.name, "Dr. Víctor Rebolledo");
});

test("expone la sesión del paciente para el encabezado", async () => {
  const { GET } = loadHeaderSessionRoute({
    patient: {
      name: "Víctor",
      email: "victor@example.com",
      profile: { fullName: "Víctor Rebolledo", email: "victor@example.com" },
    },
  });

  const response = await GET();

  assert.deepEqual(response.body, {
    authenticated: true,
    session: {
      kind: "patient",
      name: "Víctor Rebolledo",
      shortName: "Víctor Rebolledo",
      email: "victor@example.com",
    },
  });
  assert.equal(response.headers["Cache-Control"], "private, no-store");
});

test("usa la sesión médica cuando no hay sesión de paciente", async () => {
  const { GET } = loadHeaderSessionRoute({
    medical: { name: "Dra. Veramed", email: "medico@example.com" },
  });

  const response = await GET();

  assert.equal(response.body.authenticated, true);
  assert.equal(response.body.session.kind, "medical");
  assert.equal(response.body.session.name, "Dra. Veramed");
  assert.equal(response.body.session.shortName, "Dra. Veramed");
});

test("acorta el botón a nombres y apellido paterno sin cambiar el nombre completo", async () => {
  const { GET } = loadHeaderSessionRoute({
    patient: {
      name: "Víctor Rebolledo Muñoz",
      email: "victor@example.com",
      profile: { fullName: "Víctor Andrés Rebolledo Muñoz", email: "victor@example.com" },
    },
  });

  const response = await GET();

  assert.equal(response.body.session.shortName, "Víctor Andrés Rebolledo");
  assert.equal(response.body.session.name, "Víctor Andrés Rebolledo Muñoz");
});

test("responde sin sesión cuando las cookies no son válidas", async () => {
  const { GET } = loadHeaderSessionRoute();
  const response = await GET();

  assert.deepEqual(response.body, { authenticated: false, session: null });
});

test("el header compacto conserva el menú de usuario autenticado", () => {
  const source = readFileSync(new URL("../components/Header.tsx", import.meta.url), "utf8");
  const compactStart = source.indexOf("if (isCompactFlowHeader)");
  const regularStart = source.indexOf("\n  return (", compactStart);
  const compactHeader = source.slice(compactStart, regularStart);

  assert.match(compactHeader, /session\s*\?/);
  assert.match(compactHeader, /<UserSessionMenu session=\{session\}/);
  assert.doesNotMatch(compactHeader, /Entorno clínico seguro/);
});
