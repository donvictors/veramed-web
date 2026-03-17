-- CreateEnum
CREATE TYPE "SymptomsRequestStatusDb" AS ENUM ('draft', 'paid', 'in_flow', 'pending_validation', 'validated', 'rejected');

-- CreateTable
CREATE TABLE "SymptomsRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "symptomsText" TEXT NOT NULL,
    "flowId" TEXT NOT NULL DEFAULT '',
    "oneLinerSummary" TEXT NOT NULL DEFAULT '',
    "primarySymptom" TEXT NOT NULL DEFAULT '',
    "secondarySymptoms" JSONB NOT NULL,
    "patientFirstName" TEXT NOT NULL,
    "patientPaternalSurname" TEXT NOT NULL DEFAULT '',
    "patientMaternalSurname" TEXT NOT NULL DEFAULT '',
    "patientRut" TEXT NOT NULL DEFAULT '',
    "patientBirthDate" TEXT NOT NULL DEFAULT '',
    "patientSex" TEXT NOT NULL DEFAULT '',
    "patientEmail" TEXT NOT NULL DEFAULT '',
    "patientPhone" TEXT NOT NULL DEFAULT '',
    "patientAddress" TEXT NOT NULL DEFAULT '',
    "antecedents" JSONB NOT NULL,
    "interpretation" JSONB NOT NULL,
    "followUpQuestions" JSONB NOT NULL,
    "followUpAnswers" JSONB NOT NULL,
    "suggestedTests" JSONB NOT NULL,
    "selectedTests" JSONB NOT NULL,
    "notes" JSONB NOT NULL,
    "engineVersion" TEXT NOT NULL DEFAULT '',
    "cachedInput" TEXT NOT NULL DEFAULT '',
    "reviewStatus" "SymptomsRequestStatusDb" NOT NULL DEFAULT 'draft',
    "validatedByEmail" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SymptomsRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymptomsPayment" (
    "requestId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "cardLast4" TEXT NOT NULL,
    "cardholder" TEXT NOT NULL,
    "status" "PaymentStatusDb" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SymptomsPayment_pkey" PRIMARY KEY ("requestId")
);

-- CreateTable
CREATE TABLE "SymptomsPaymentTransaction" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "webpayUrl" TEXT NOT NULL,
    "status" "TransbankTransactionStatusDb" NOT NULL DEFAULT 'created',
    "authorizationCode" TEXT,
    "buyOrder" TEXT,
    "responseCode" INTEGER,
    "paymentTypeCode" TEXT,
    "cardLast4" TEXT,
    "transactionDate" TIMESTAMP(3),
    "transbankResponse" JSONB,
    "errorReason" TEXT,
    "committedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SymptomsPaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymptomsOrderPdfAsset" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "category" "OrderPdfCategoryDb" NOT NULL,
    "fileName" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "blobPath" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SymptomsOrderPdfAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SymptomsRequest_userId_idx" ON "SymptomsRequest"("userId");

-- CreateIndex
CREATE INDEX "SymptomsRequest_reviewStatus_createdAt_idx" ON "SymptomsRequest"("reviewStatus", "createdAt");

-- CreateIndex
CREATE INDEX "SymptomsRequest_validatedByEmail_validatedAt_idx" ON "SymptomsRequest"("validatedByEmail", "validatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SymptomsPayment_paymentId_key" ON "SymptomsPayment"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "SymptomsPaymentTransaction_orderId_key" ON "SymptomsPaymentTransaction"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "SymptomsPaymentTransaction_token_key" ON "SymptomsPaymentTransaction"("token");

-- CreateIndex
CREATE INDEX "SymptomsPaymentTransaction_requestId_idx" ON "SymptomsPaymentTransaction"("requestId");

-- CreateIndex
CREATE INDEX "SymptomsPaymentTransaction_status_createdAt_idx" ON "SymptomsPaymentTransaction"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SymptomsOrderPdfAsset_requestId_category_key" ON "SymptomsOrderPdfAsset"("requestId", "category");

-- CreateIndex
CREATE INDEX "SymptomsOrderPdfAsset_requestId_idx" ON "SymptomsOrderPdfAsset"("requestId");

-- AddForeignKey
ALTER TABLE "SymptomsRequest" ADD CONSTRAINT "SymptomsRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomsPayment" ADD CONSTRAINT "SymptomsPayment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SymptomsRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomsPaymentTransaction" ADD CONSTRAINT "SymptomsPaymentTransaction_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SymptomsRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomsOrderPdfAsset" ADD CONSTRAINT "SymptomsOrderPdfAsset_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SymptomsRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
