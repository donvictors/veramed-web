ALTER TABLE "ChronicControlRequest"
ADD COLUMN "selectedAntiepileptics" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "selectedOptionalMedicationTests" JSONB NOT NULL DEFAULT '[]';
