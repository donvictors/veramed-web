CREATE TYPE "NewServiceTypeDb" AS ENUM ('kinesiology', 'prescription_renewal', 'weight_management');
CREATE TYPE "NewServiceRequestStatusDb" AS ENUM ('draft', 'eligibility_complete', 'awaiting_payment', 'paid', 'awaiting_physician_review', 'approved', 'rejected', 'document_generated', 'completed');
CREATE TYPE "TelemedicineAppointmentStatusDb" AS ENUM ('slot_selected', 'payment_pending', 'booked', 'completed', 'cancelled');

ALTER TYPE "TransbankRequestTypeDb" ADD VALUE IF NOT EXISTS 'new_service';
ALTER TYPE "TransbankRequestTypeDb" ADD VALUE IF NOT EXISTS 'telemedicine';

CREATE TABLE "NewServiceRequest" (
  "id" TEXT NOT NULL, "type" "NewServiceTypeDb" NOT NULL,
  "status" "NewServiceRequestStatusDb" NOT NULL DEFAULT 'draft', "userId" TEXT,
  "patientData" JSONB NOT NULL, "questionnaire" JSONB NOT NULL,
  "extractedClinicalData" JSONB, "eligibilityResult" TEXT NOT NULL,
  "protocolVersion" TEXT NOT NULL, "priceClp" INTEGER,
  "uploadedDocumentPath" TEXT, "uploadedDocumentName" TEXT, "uploadedDocumentMime" TEXT,
  "physicianValidation" JSONB, "finalDocumentPath" TEXT, "prescriptionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NewServiceRequest_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WeightManagementFollowUp" (
  "id" TEXT NOT NULL, "requestId" TEXT NOT NULL, "week" INTEGER NOT NULL,
  "answers" JSONB NOT NULL, "outcome" TEXT NOT NULL, "protocolVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WeightManagementFollowUp_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TelemedicineAppointment" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "clinicianId" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL, "durationMinutes" INTEGER NOT NULL DEFAULT 20,
  "status" "TelemedicineAppointmentStatusDb" NOT NULL DEFAULT 'slot_selected',
  "priceClp" INTEGER NOT NULL DEFAULT 19990, "sourceFlow" TEXT NOT NULL,
  "patientData" JSONB NOT NULL, "paymentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TelemedicineAppointment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NewServiceRequest_type_status_createdAt_idx" ON "NewServiceRequest"("type", "status", "createdAt");
CREATE INDEX "NewServiceRequest_userId_createdAt_idx" ON "NewServiceRequest"("userId", "createdAt");
CREATE UNIQUE INDEX "WeightManagementFollowUp_requestId_week_key" ON "WeightManagementFollowUp"("requestId", "week");
CREATE INDEX "TelemedicineAppointment_startsAt_status_idx" ON "TelemedicineAppointment"("startsAt", "status");
CREATE INDEX "TelemedicineAppointment_userId_createdAt_idx" ON "TelemedicineAppointment"("userId", "createdAt");
CREATE UNIQUE INDEX "TelemedicineAppointment_clinicianId_startsAt_key" ON "TelemedicineAppointment"("clinicianId", "startsAt");
ALTER TABLE "NewServiceRequest" ADD CONSTRAINT "NewServiceRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WeightManagementFollowUp" ADD CONSTRAINT "WeightManagementFollowUp_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "NewServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TelemedicineAppointment" ADD CONSTRAINT "TelemedicineAppointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
