CREATE TYPE "public"."MedicalApprovalMethodDb" AS ENUM ('automatic_protocol', 'manual');
CREATE TYPE "public"."ClinicalRequestTypeDb" AS ENUM ('checkup', 'chronic_control', 'symptoms');
CREATE TYPE "public"."DiscountTypeDb" AS ENUM ('percent_off', 'fixed_final_amount');
CREATE TYPE "public"."OrderPdfAccessOutcomeDb" AS ENUM ('granted', 'expired', 'revoked', 'not_found', 'storage_error');

ALTER TABLE "public"."CheckupRequest"
ADD COLUMN "approvedByName" TEXT,
ADD COLUMN "approvedByRut" TEXT,
ADD COLUMN "approvedBySis" TEXT,
ADD COLUMN "approvedByEmail" TEXT,
ADD COLUMN "approvalMethod" "public"."MedicalApprovalMethodDb",
ADD COLUMN "approvalProtocolVersion" TEXT;

ALTER TABLE "public"."ChronicControlRequest"
ADD COLUMN "approvedByName" TEXT,
ADD COLUMN "approvedByRut" TEXT,
ADD COLUMN "approvedBySis" TEXT,
ADD COLUMN "approvedByEmail" TEXT,
ADD COLUMN "approvalMethod" "public"."MedicalApprovalMethodDb",
ADD COLUMN "approvalProtocolVersion" TEXT;

CREATE TABLE "public"."DiscountCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "public"."DiscountTypeDb" NOT NULL,
    "percentOff" INTEGER,
    "finalAmountClp" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."OrderPdfAccessLink" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "requestType" "public"."ClinicalRequestTypeDb" NOT NULL,
    "requestId" TEXT NOT NULL,
    "category" "public"."OrderPdfCategoryDb" NOT NULL,
    "blobPath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "recipientKeyHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3),
    CONSTRAINT "OrderPdfAccessLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."OrderPdfAccessLog" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "outcome" "public"."OrderPdfAccessOutcomeDb" NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderPdfAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscountCode_codeHash_key" ON "public"."DiscountCode"("codeHash");
CREATE INDEX "DiscountCode_active_startsAt_expiresAt_idx" ON "public"."DiscountCode"("active", "startsAt", "expiresAt");
CREATE UNIQUE INDEX "OrderPdfAccessLink_tokenHash_key" ON "public"."OrderPdfAccessLink"("tokenHash");
CREATE INDEX "OrderPdfAccessLink_requestType_requestId_idx" ON "public"."OrderPdfAccessLink"("requestType", "requestId");
CREATE INDEX "OrderPdfAccessLink_expiresAt_revokedAt_idx" ON "public"."OrderPdfAccessLink"("expiresAt", "revokedAt");
CREATE INDEX "OrderPdfAccessLog_linkId_accessedAt_idx" ON "public"."OrderPdfAccessLog"("linkId", "accessedAt");
CREATE INDEX "OrderPdfAccessLog_outcome_accessedAt_idx" ON "public"."OrderPdfAccessLog"("outcome", "accessedAt");

ALTER TABLE "public"."OrderPdfAccessLog"
ADD CONSTRAINT "OrderPdfAccessLog_linkId_fkey"
FOREIGN KEY ("linkId") REFERENCES "public"."OrderPdfAccessLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
