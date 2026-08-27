-- CreateEnum
CREATE TYPE "MedicalPortalRoleDb" AS ENUM ('doctor', 'admin');

-- CreateEnum
CREATE TYPE "OutboxStatusDb" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- AlterTable
ALTER TABLE "SymptomsRequest" ADD COLUMN "aiConsentAt" TIMESTAMP(3),
ADD COLUMN "aiConsentVersion" TEXT,
ADD COLUMN "aiProvider" TEXT,
ADD COLUMN "validatedByUserId" TEXT,
ADD COLUMN "validatedByName" TEXT,
ADD COLUMN "validatedByRut" TEXT,
ADD COLUMN "validatedBySis" TEXT;

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "keyHash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("keyHash","action","windowStart")
);

-- CreateTable
CREATE TABLE "MedicalPortalUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "medicalRut" TEXT,
    "sisRegistration" TEXT,
    "role" "MedicalPortalRoleDb" NOT NULL DEFAULT 'doctor',
    "passwordHash" TEXT NOT NULL,
    "passwordSalt" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totpSecretEncrypted" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalPortalUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalPortalSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "MedicalPortalSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "requestType" "ClinicalRequestTypeDb",
    "requestId" TEXT,
    "metadata" JSONB,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventOutbox" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatusDb" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalPortalUser_email_key" ON "MedicalPortalUser"("email");

-- CreateIndex
CREATE INDEX "MedicalPortalUser_active_role_idx" ON "MedicalPortalUser"("active", "role");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalPortalSession_tokenHash_key" ON "MedicalPortalSession"("tokenHash");

-- CreateIndex
CREATE INDEX "MedicalPortalSession_userId_expiresAt_idx" ON "MedicalPortalSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "MedicalPortalSession_expiresAt_revokedAt_idx" ON "MedicalPortalSession"("expiresAt", "revokedAt");

-- CreateIndex
CREATE INDEX "MedicalAuditLog_userId_createdAt_idx" ON "MedicalAuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MedicalAuditLog_requestType_requestId_createdAt_idx" ON "MedicalAuditLog"("requestType", "requestId", "createdAt");

-- CreateIndex
CREATE INDEX "MedicalAuditLog_action_createdAt_idx" ON "MedicalAuditLog"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventOutbox_dedupeKey_key" ON "EventOutbox"("dedupeKey");

-- CreateIndex
CREATE INDEX "EventOutbox_status_nextAttemptAt_idx" ON "EventOutbox"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "EventOutbox_aggregateType_aggregateId_idx" ON "EventOutbox"("aggregateType", "aggregateId");

-- AddForeignKey
ALTER TABLE "MedicalPortalSession" ADD CONSTRAINT "MedicalPortalSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MedicalPortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalAuditLog" ADD CONSTRAINT "MedicalAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MedicalPortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
