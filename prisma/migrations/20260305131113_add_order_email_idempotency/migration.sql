-- AlterTable
ALTER TABLE "public"."CheckupRequest" ADD COLUMN     "orderEmailMessageId" TEXT,
ADD COLUMN     "orderEmailSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."ChronicControlRequest" ADD COLUMN     "orderEmailMessageId" TEXT,
ADD COLUMN     "orderEmailSentAt" TIMESTAMP(3);
