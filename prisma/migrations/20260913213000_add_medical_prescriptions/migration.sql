-- CreateEnum
CREATE TYPE "MedicalPrescriptionStatusDb" AS ENUM ('signed', 'sent', 'email_failed', 'revoked');

-- CreateTable
CREATE TABLE "MedicalPrescription" (
    "id" TEXT NOT NULL,
    "prescriberUserId" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "patientFirstName" TEXT NOT NULL,
    "patientPaternalSurname" TEXT NOT NULL DEFAULT '',
    "patientMaternalSurname" TEXT NOT NULL DEFAULT '',
    "patientRut" TEXT NOT NULL,
    "patientBirthDate" TEXT NOT NULL DEFAULT '',
    "patientEmail" TEXT NOT NULL,
    "patientPhone" TEXT NOT NULL DEFAULT '',
    "patientAddress" TEXT NOT NULL DEFAULT '',
    "prescriberName" TEXT NOT NULL,
    "prescriberRut" TEXT NOT NULL,
    "prescriberSis" TEXT NOT NULL,
    "prescriberEmail" TEXT NOT NULL,
    "prescriberSpecialty" TEXT NOT NULL DEFAULT '',
    "items" JSONB NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "status" "MedicalPrescriptionStatusDb" NOT NULL DEFAULT 'signed',
    "fileName" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "blobPath" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailSentAt" TIMESTAMP(3),
    "emailMessageId" TEXT,
    "emailError" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalPrescription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicalPrescription_verificationCode_key" ON "MedicalPrescription"("verificationCode");
CREATE INDEX "MedicalPrescription_prescriberUserId_createdAt_idx" ON "MedicalPrescription"("prescriberUserId", "createdAt");
CREATE INDEX "MedicalPrescription_patientUserId_createdAt_idx" ON "MedicalPrescription"("patientUserId", "createdAt");
CREATE INDEX "MedicalPrescription_patientRut_createdAt_idx" ON "MedicalPrescription"("patientRut", "createdAt");
CREATE INDEX "MedicalPrescription_status_createdAt_idx" ON "MedicalPrescription"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "MedicalPrescription" ADD CONSTRAINT "MedicalPrescription_prescriberUserId_fkey" FOREIGN KEY ("prescriberUserId") REFERENCES "MedicalPortalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicalPrescription" ADD CONSTRAINT "MedicalPrescription_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
