-- Additive, nullable fields keep every existing symptoms request readable.
ALTER TABLE "SymptomsRequest"
ADD COLUMN "clinicalState" JSONB,
ADD COLUMN "questionQueue" JSONB,
ADD COLUMN "interviewMetadata" JSONB;
