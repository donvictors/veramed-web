BEGIN;

-- Add normalized profile columns
ALTER TABLE "public"."User"
ADD COLUMN "profileFirstName" TEXT,
ADD COLUMN "profilePaternalSurname" TEXT NOT NULL DEFAULT '',
ADD COLUMN "profileMaternalSurname" TEXT NOT NULL DEFAULT '';

-- Backfill profile names from legacy full name
UPDATE "public"."User"
SET "profileFirstName" = COALESCE(NULLIF("profileFullName", ''), "name");

ALTER TABLE "public"."User"
ALTER COLUMN "profileFirstName" SET NOT NULL;

-- Add normalized patient columns to checkups
ALTER TABLE "public"."CheckupRequest"
ADD COLUMN "patientFirstName" TEXT,
ADD COLUMN "patientPaternalSurname" TEXT NOT NULL DEFAULT '',
ADD COLUMN "patientMaternalSurname" TEXT NOT NULL DEFAULT '',
ADD COLUMN "patientRut" TEXT NOT NULL DEFAULT '',
ADD COLUMN "patientBirthDate" TEXT NOT NULL DEFAULT '',
ADD COLUMN "patientEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN "patientPhone" TEXT NOT NULL DEFAULT '',
ADD COLUMN "patientAddress" TEXT NOT NULL DEFAULT '';

-- Backfill checkup patient columns from legacy JSON
UPDATE "public"."CheckupRequest"
SET
  "patientFirstName" = COALESCE(NULLIF("patient"->>'fullName', ''), 'Paciente'),
  "patientRut" = COALESCE("patient"->>'rut', ''),
  "patientBirthDate" = COALESCE("patient"->>'birthDate', ''),
  "patientEmail" = COALESCE("patient"->>'email', ''),
  "patientPhone" = COALESCE("patient"->>'phone', ''),
  "patientAddress" = COALESCE("patient"->>'address', '');

ALTER TABLE "public"."CheckupRequest"
ALTER COLUMN "patientFirstName" SET NOT NULL;

-- Add normalized patient columns to chronic controls
ALTER TABLE "public"."ChronicControlRequest"
ADD COLUMN "patientFirstName" TEXT,
ADD COLUMN "patientPaternalSurname" TEXT NOT NULL DEFAULT '',
ADD COLUMN "patientMaternalSurname" TEXT NOT NULL DEFAULT '',
ADD COLUMN "patientRut" TEXT NOT NULL DEFAULT '',
ADD COLUMN "patientBirthDate" TEXT NOT NULL DEFAULT '',
ADD COLUMN "patientEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN "patientPhone" TEXT NOT NULL DEFAULT '',
ADD COLUMN "patientAddress" TEXT NOT NULL DEFAULT '';

-- Backfill chronic patient columns from legacy JSON
UPDATE "public"."ChronicControlRequest"
SET
  "patientFirstName" = COALESCE(NULLIF("patient"->>'fullName', ''), 'Paciente'),
  "patientRut" = COALESCE("patient"->>'rut', ''),
  "patientBirthDate" = COALESCE("patient"->>'birthDate', ''),
  "patientEmail" = COALESCE("patient"->>'email', ''),
  "patientPhone" = COALESCE("patient"->>'phone', ''),
  "patientAddress" = COALESCE("patient"->>'address', '');

ALTER TABLE "public"."ChronicControlRequest"
ALTER COLUMN "patientFirstName" SET NOT NULL;

-- Drop legacy denormalized columns
ALTER TABLE "public"."User" DROP COLUMN "profileFullName";
ALTER TABLE "public"."CheckupRequest" DROP COLUMN "patient";
ALTER TABLE "public"."ChronicControlRequest" DROP COLUMN "patient";

COMMIT;
