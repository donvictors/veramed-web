-- CreateEnum
CREATE TYPE "public"."TransbankTransactionStatusDb" AS ENUM ('created', 'paid', 'rejected');

-- CreateEnum
CREATE TYPE "public"."TransbankRequestTypeDb" AS ENUM ('checkup', 'chronic_control');

-- CreateTable
CREATE TABLE "public"."TransbankPaymentTransaction" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "requestType" "public"."TransbankRequestTypeDb" NOT NULL,
    "requestId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "webpayUrl" TEXT NOT NULL,
    "status" "public"."TransbankTransactionStatusDb" NOT NULL DEFAULT 'created',
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

    CONSTRAINT "TransbankPaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransbankPaymentTransaction_orderId_key" ON "public"."TransbankPaymentTransaction"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "TransbankPaymentTransaction_token_key" ON "public"."TransbankPaymentTransaction"("token");

-- CreateIndex
CREATE INDEX "TransbankPaymentTransaction_requestType_requestId_idx" ON "public"."TransbankPaymentTransaction"("requestType", "requestId");

-- CreateIndex
CREATE INDEX "TransbankPaymentTransaction_status_createdAt_idx" ON "public"."TransbankPaymentTransaction"("status", "createdAt");
