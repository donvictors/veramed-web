import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");

test("la agenda persiste bloques clínicos, cupos, bloqueos y pacientes", () => {
  const schema = read("prisma/schema.prisma");
  const service = read("lib/server/medical-schedule.ts");
  const dashboard = read("app/portal-medicos/_components/MedicalDashboard.tsx");

  for (const type of ["short_consultation", "follow_up", "intake", "home_visit", "blocked"]) {
    assert.match(schema, new RegExp(type));
  }
  assert.match(schema, /model MedicalScheduleAppointment/);
  assert.match(service, /se superpone con otro bloque/);
  assert.match(service, /block\.appointments\.length >= block\.slotCount/);
  assert.match(dashboard, /\+ Añadir paciente/);
  assert.match(dashboard, /Turno bloqueado/);
});

test("el punto verde aparece sólo cuando existe al menos un paciente citado", () => {
  const dashboard = read("app/portal-medicos/_components/MedicalDashboard.tsx");
  assert.match(dashboard, /blocks\.filter\(\(block\) => block\.appointments\.length > 0\)/);
  assert.doesNotMatch(dashboard, /activityDays.*slotCount/);
  assert.match(dashboard, /bg-emerald-500/);
});

test("las mutaciones de agenda exigen sesión, mismo origen, límites y auditoría", () => {
  const collection = read("app/api/portal-medicos/schedule/route.ts");
  const block = read("app/api/portal-medicos/schedule/[id]/route.ts");
  const appointment = read("app/api/portal-medicos/schedule/[id]/appointments/route.ts");

  for (const source of [collection, block, appointment]) {
    assert.match(source, /requireSameOrigin\(request\)/);
    assert.match(source, /enforceRateLimit/);
    assert.match(source, /recordMedicalAudit/);
    assert.match(source, /verifyMedicalPortalSessionToken/);
  }
});
