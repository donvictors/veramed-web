-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordSalt" TEXT NOT NULL,
    "profileFullName" TEXT NOT NULL,
    "profileRut" TEXT NOT NULL DEFAULT '',
    "profileBirthDate" TEXT NOT NULL DEFAULT '',
    "profileEmail" TEXT NOT NULL,
    "profilePhone" TEXT NOT NULL DEFAULT '',
    "profileAddress" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "public"."CheckupRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "input" JSONB NOT NULL,
    "patient" JSONB NOT NULL,
    "rec" JSONB NOT NULL,
    "paymentPending" JSONB,
    "paymentConfirmed" JSONB,
    "status" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChronicControlRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "conditions" JSONB NOT NULL,
    "patient" JSONB NOT NULL,
    "yearsSinceDiagnosis" INTEGER NOT NULL,
    "hasRecentChanges" BOOLEAN NOT NULL,
    "usesMedication" BOOLEAN NOT NULL,
    "selectedMedications" JSONB NOT NULL,
    "rec" JSONB NOT NULL,
    "paymentPending" JSONB,
    "paymentConfirmed" JSONB,
    "status" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChronicControlRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "public"."Session"("expiresAt");

-- CreateIndex
CREATE INDEX "CheckupRequest_userId_idx" ON "public"."CheckupRequest"("userId");

-- CreateIndex
CREATE INDEX "ChronicControlRequest_userId_idx" ON "public"."ChronicControlRequest"("userId");

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CheckupRequest" ADD CONSTRAINT "CheckupRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChronicControlRequest" ADD CONSTRAINT "ChronicControlRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
