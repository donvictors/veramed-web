ALTER TABLE "TransbankPaymentTransaction" ADD COLUMN "discountCodeId" TEXT;
ALTER TABLE "SymptomsPaymentTransaction" ADD COLUMN "discountCodeId" TEXT;
ALTER TABLE "ElectronicReceipt" ADD COLUMN "archivedAt" TIMESTAMP(3), ADD COLUMN "archivedByUserId" TEXT;
ALTER TABLE "DiscountCode" ADD COLUMN "codeCiphertext" TEXT;

CREATE INDEX "TransbankPaymentTransaction_discountCodeId_status_idx" ON "TransbankPaymentTransaction"("discountCodeId", "status");
CREATE INDEX "SymptomsPaymentTransaction_discountCodeId_status_idx" ON "SymptomsPaymentTransaction"("discountCodeId", "status");
CREATE INDEX "ElectronicReceipt_archivedAt_createdAt_idx" ON "ElectronicReceipt"("archivedAt", "createdAt");
