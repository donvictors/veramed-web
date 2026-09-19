-- Allow prescriptions for patients who do not have a Veramed account.
ALTER TABLE "MedicalPrescription"
DROP CONSTRAINT "MedicalPrescription_patientUserId_fkey";

ALTER TABLE "MedicalPrescription"
ALTER COLUMN "patientUserId" DROP NOT NULL;

ALTER TABLE "MedicalPrescription"
ADD CONSTRAINT "MedicalPrescription_patientUserId_fkey"
FOREIGN KEY ("patientUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
