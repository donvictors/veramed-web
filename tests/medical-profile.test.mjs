import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadModule } from "./helpers/load-typescript.mjs";

const {
  joinMedicalPortalName,
  medicalPortalInitials,
  splitMedicalPortalName,
} = loadModule("lib/medical-portal/profile.ts");

test("separa y recompone nombres médicos conservando nombres compuestos", () => {
  const fields = splitMedicalPortalName("Víctor Andrés Rebolledo Muñoz");
  assert.deepEqual(fields, {
    firstName: "Víctor Andrés",
    paternalSurname: "Rebolledo",
    maternalSurname: "Muñoz",
  });
  assert.equal(joinMedicalPortalName(fields), "Víctor Andrés Rebolledo Muñoz");
});

test("el avatar usa nombre y apellido paterno, con materno como respaldo", () => {
  assert.equal(
    medicalPortalInitials({
      firstName: "Víctor Andrés",
      paternalSurname: "Rebolledo",
      maternalSurname: "Muñoz",
    }),
    "VR",
  );
  assert.equal(
    medicalPortalInitials({
      firstName: "Víctor",
      paternalSurname: "",
      maternalSurname: "Muñoz",
    }),
    "VM",
  );
});

test("el perfil médico se edita mediante una ruta autenticada y auditable", () => {
  const route = readFileSync(
    new URL("../app/api/medicos-auth/profile/route.ts", import.meta.url),
    "utf8",
  );
  const form = readFileSync(
    new URL("../app/portal-medicos/_components/ProfileSettings.tsx", import.meta.url),
    "utf8",
  );
  const shell = readFileSync(
    new URL("../app/portal-medicos/_components/MedicalPortalShell.tsx", import.meta.url),
    "utf8",
  );

  assert.match(route, /verifyMedicalPortalSessionToken/);
  assert.match(route, /requireSameOrigin\(request\)/);
  assert.match(route, /medical\.profile_updated/);
  assert.match(form, /Apellido paterno/);
  assert.match(form, /Apellido materno/);
  assert.match(form, /method: "PATCH"/);
  assert.match(shell, /doctor\.specialty \|\| "Especialidad no configurada"/);
  assert.doesNotMatch(shell, /doctor\.isPrimaryAdmin \? "Administrador principal"/);
});
