ALTER TYPE "MedicalPortalRoleDb" ADD VALUE IF NOT EXISTS 'portal' BEFORE 'doctor';

UPDATE "MedicalPortalUser"
SET "role" = 'admin', "active" = TRUE, "updatedAt" = CURRENT_TIMESTAMP
WHERE LOWER("email") = 'victorrebolledom@gmail.com';

CREATE TABLE "MedicalPortalInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MedicalPortalRoleDb" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "invitedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalPortalInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MedicalPortalInvitation_tokenHash_key" ON "MedicalPortalInvitation"("tokenHash");
CREATE INDEX "MedicalPortalInvitation_email_createdAt_idx" ON "MedicalPortalInvitation"("email", "createdAt");
CREATE INDEX "MedicalPortalInvitation_expiresAt_acceptedAt_revokedAt_idx" ON "MedicalPortalInvitation"("expiresAt", "acceptedAt", "revokedAt");
CREATE INDEX "MedicalPortalInvitation_invitedByUserId_createdAt_idx" ON "MedicalPortalInvitation"("invitedByUserId", "createdAt");

ALTER TABLE "MedicalPortalInvitation"
ADD CONSTRAINT "MedicalPortalInvitation_invitedByUserId_fkey"
FOREIGN KEY ("invitedByUserId") REFERENCES "MedicalPortalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
