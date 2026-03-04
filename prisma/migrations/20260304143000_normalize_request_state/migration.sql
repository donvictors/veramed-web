-- CreateEnum
CREATE TYPE "public"."ReviewStatusDb" AS ENUM ('queued', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "public"."PaymentStatusDb" AS ENUM ('pending', 'paid');

-- AlterTable
ALTER TABLE "public"."CheckupRequest"
ADD COLUMN "reviewStatus" "public"."ReviewStatusDb",
ADD COLUMN "queuedAt" TIMESTAMP(3),
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "orderId" TEXT;

-- AlterTable
ALTER TABLE "public"."ChronicControlRequest"
ADD COLUMN "reviewStatus" "public"."ReviewStatusDb",
ADD COLUMN "queuedAt" TIMESTAMP(3),
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "orderId" TEXT;

-- Backfill CheckupRequest review state
UPDATE "public"."CheckupRequest"
SET
  "reviewStatus" = COALESCE(("status"->>'status')::"public"."ReviewStatusDb", 'queued'::"public"."ReviewStatusDb"),
  "queuedAt" = CASE
    WHEN "status" ? 'queuedAt' AND NULLIF("status"->>'queuedAt', '') IS NOT NULL
    THEN TO_TIMESTAMP(("status"->>'queuedAt')::DOUBLE PRECISION / 1000.0)
    ELSE NULL
  END,
  "approvedAt" = CASE
    WHEN "status" ? 'approvedAt' AND NULLIF("status"->>'approvedAt', '') IS NOT NULL
    THEN TO_TIMESTAMP(("status"->>'approvedAt')::DOUBLE PRECISION / 1000.0)
    ELSE NULL
  END,
  "rejectedAt" = CASE
    WHEN "status" ? 'rejectedAt' AND NULLIF("status"->>'rejectedAt', '') IS NOT NULL
    THEN TO_TIMESTAMP(("status"->>'rejectedAt')::DOUBLE PRECISION / 1000.0)
    ELSE NULL
  END,
  "orderId" = NULLIF("status"->>'orderId', '');

-- Backfill ChronicControlRequest review state
UPDATE "public"."ChronicControlRequest"
SET
  "reviewStatus" = COALESCE(("status"->>'status')::"public"."ReviewStatusDb", 'queued'::"public"."ReviewStatusDb"),
  "queuedAt" = CASE
    WHEN "status" ? 'queuedAt' AND NULLIF("status"->>'queuedAt', '') IS NOT NULL
    THEN TO_TIMESTAMP(("status"->>'queuedAt')::DOUBLE PRECISION / 1000.0)
    ELSE NULL
  END,
  "approvedAt" = CASE
    WHEN "status" ? 'approvedAt' AND NULLIF("status"->>'approvedAt', '') IS NOT NULL
    THEN TO_TIMESTAMP(("status"->>'approvedAt')::DOUBLE PRECISION / 1000.0)
    ELSE NULL
  END,
  "rejectedAt" = CASE
    WHEN "status" ? 'rejectedAt' AND NULLIF("status"->>'rejectedAt', '') IS NOT NULL
    THEN TO_TIMESTAMP(("status"->>'rejectedAt')::DOUBLE PRECISION / 1000.0)
    ELSE NULL
  END,
  "orderId" = NULLIF("status"->>'orderId', '');

-- Make reviewStatus required with default
ALTER TABLE "public"."CheckupRequest"
ALTER COLUMN "reviewStatus" SET DEFAULT 'queued',
ALTER COLUMN "reviewStatus" SET NOT NULL;

-- Make reviewStatus required with default
ALTER TABLE "public"."ChronicControlRequest"
ALTER COLUMN "reviewStatus" SET DEFAULT 'queued',
ALTER COLUMN "reviewStatus" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."CheckupPayment" (
    "requestId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "cardLast4" TEXT NOT NULL,
    "cardholder" TEXT NOT NULL,
    "status" "public"."PaymentStatusDb" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckupPayment_pkey" PRIMARY KEY ("requestId")
);

-- CreateTable
CREATE TABLE "public"."ChronicControlPayment" (
    "requestId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "cardLast4" TEXT NOT NULL,
    "cardholder" TEXT NOT NULL,
    "status" "public"."PaymentStatusDb" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChronicControlPayment_pkey" PRIMARY KEY ("requestId")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckupPayment_paymentId_key" ON "public"."CheckupPayment"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "ChronicControlPayment_paymentId_key" ON "public"."ChronicControlPayment"("paymentId");

-- Backfill Checkup payments
INSERT INTO "public"."CheckupPayment" (
  "requestId",
  "amount",
  "currency",
  "paymentId",
  "cardLast4",
  "cardholder",
  "status",
  "createdAt",
  "paidAt",
  "updatedAt"
)
SELECT
  "id",
  COALESCE(("paymentConfirmed"->>'amount')::INTEGER, ("paymentPending"->>'amount')::INTEGER),
  COALESCE(NULLIF("paymentConfirmed"->>'currency', ''), NULLIF("paymentPending"->>'currency', ''), 'CLP'),
  COALESCE(NULLIF("paymentConfirmed"->>'paymentId', ''), NULLIF("paymentPending"->>'paymentId', '')),
  COALESCE(NULLIF("paymentConfirmed"->>'cardLast4', ''), NULLIF("paymentPending"->>'cardLast4', '')),
  COALESCE(NULLIF("paymentConfirmed"->>'cardholder', ''), NULLIF("paymentPending"->>'cardholder', '')),
  CASE
    WHEN "paymentConfirmed" IS NOT NULL THEN 'paid'::"public"."PaymentStatusDb"
    ELSE 'pending'::"public"."PaymentStatusDb"
  END,
  "updatedAt",
  CASE
    WHEN "paymentConfirmed" IS NOT NULL
      AND NULLIF("paymentConfirmed"->>'paidAt', '') IS NOT NULL
      AND ("paymentConfirmed"->>'paidAt') <> '0'
    THEN TO_TIMESTAMP(("paymentConfirmed"->>'paidAt')::DOUBLE PRECISION / 1000.0)
    ELSE NULL
  END,
  "updatedAt"
FROM "public"."CheckupRequest"
WHERE "paymentPending" IS NOT NULL OR "paymentConfirmed" IS NOT NULL;

-- Backfill ChronicControl payments
INSERT INTO "public"."ChronicControlPayment" (
  "requestId",
  "amount",
  "currency",
  "paymentId",
  "cardLast4",
  "cardholder",
  "status",
  "createdAt",
  "paidAt",
  "updatedAt"
)
SELECT
  "id",
  COALESCE(("paymentConfirmed"->>'amount')::INTEGER, ("paymentPending"->>'amount')::INTEGER),
  COALESCE(NULLIF("paymentConfirmed"->>'currency', ''), NULLIF("paymentPending"->>'currency', ''), 'CLP'),
  COALESCE(NULLIF("paymentConfirmed"->>'paymentId', ''), NULLIF("paymentPending"->>'paymentId', '')),
  COALESCE(NULLIF("paymentConfirmed"->>'cardLast4', ''), NULLIF("paymentPending"->>'cardLast4', '')),
  COALESCE(NULLIF("paymentConfirmed"->>'cardholder', ''), NULLIF("paymentPending"->>'cardholder', '')),
  CASE
    WHEN "paymentConfirmed" IS NOT NULL THEN 'paid'::"public"."PaymentStatusDb"
    ELSE 'pending'::"public"."PaymentStatusDb"
  END,
  "updatedAt",
  CASE
    WHEN "paymentConfirmed" IS NOT NULL
      AND NULLIF("paymentConfirmed"->>'paidAt', '') IS NOT NULL
      AND ("paymentConfirmed"->>'paidAt') <> '0'
    THEN TO_TIMESTAMP(("paymentConfirmed"->>'paidAt')::DOUBLE PRECISION / 1000.0)
    ELSE NULL
  END,
  "updatedAt"
FROM "public"."ChronicControlRequest"
WHERE "paymentPending" IS NOT NULL OR "paymentConfirmed" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."CheckupPayment" ADD CONSTRAINT "CheckupPayment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."CheckupRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChronicControlPayment" ADD CONSTRAINT "ChronicControlPayment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."ChronicControlRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop legacy JSON state/payment columns
ALTER TABLE "public"."CheckupRequest"
DROP COLUMN "paymentPending",
DROP COLUMN "paymentConfirmed",
DROP COLUMN "status";

-- Drop legacy JSON state/payment columns
ALTER TABLE "public"."ChronicControlRequest"
DROP COLUMN "paymentPending",
DROP COLUMN "paymentConfirmed",
DROP COLUMN "status";

COMMIT;
BEGIN;
