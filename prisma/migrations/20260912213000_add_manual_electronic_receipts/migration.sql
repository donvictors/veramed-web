CREATE TYPE "ElectronicReceiptStatusDb" AS ENUM ('pending', 'ready', 'sent');

ALTER TABLE "SymptomsRequest"
ADD COLUMN "orderEmailSentAt" TIMESTAMP(3),
ADD COLUMN "orderEmailMessageId" TEXT;

CREATE TABLE "ElectronicReceipt" (
    "id" TEXT NOT NULL,
    "requestType" "ClinicalRequestTypeDb" NOT NULL,
    "requestId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "serviceLabel" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientEmail" TEXT NOT NULL,
    "patientRut" TEXT,
    "status" "ElectronicReceiptStatusDb" NOT NULL DEFAULT 'pending',
    "folio" TEXT,
    "fileName" TEXT,
    "blobUrl" TEXT,
    "blobPath" TEXT,
    "sizeBytes" INTEGER,
    "issuedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3),
    "uploadedByUserId" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "emailMessageId" TEXT,
    "lastEmailError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectronicReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ElectronicReceipt_requestType_requestId_key"
ON "ElectronicReceipt"("requestType", "requestId");

CREATE INDEX "ElectronicReceipt_status_createdAt_idx"
ON "ElectronicReceipt"("status", "createdAt");

CREATE INDEX "ElectronicReceipt_patientEmail_createdAt_idx"
ON "ElectronicReceipt"("patientEmail", "createdAt");
