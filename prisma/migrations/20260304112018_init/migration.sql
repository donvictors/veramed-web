-- CreateTable
CREATE TABLE "public"."Healthcheck" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Healthcheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Healthcheck_key_key" ON "public"."Healthcheck"("key");
