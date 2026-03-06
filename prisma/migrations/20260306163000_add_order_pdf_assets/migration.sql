-- CreateEnum
CREATE TYPE "OrderPdfCategoryDb" AS ENUM ('laboratory', 'image', 'procedure');

-- CreateTable
CREATE TABLE "OrderPdfAsset" (
    "id" TEXT NOT NULL,
    "requestType" "TransbankRequestTypeDb" NOT NULL,
    "requestId" TEXT NOT NULL,
    "category" "OrderPdfCategoryDb" NOT NULL,
    "fileName" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "blobPath" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderPdfAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderPdfAsset_requestType_requestId_category_key" ON "OrderPdfAsset"("requestType", "requestId", "category");

-- CreateIndex
CREATE INDEX "OrderPdfAsset_requestType_requestId_idx" ON "OrderPdfAsset"("requestType", "requestId");
