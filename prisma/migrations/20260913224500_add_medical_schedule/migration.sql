CREATE TYPE "MedicalScheduleBlockTypeDb" AS ENUM ('short_consultation', 'follow_up', 'intake', 'home_visit', 'blocked');

CREATE TABLE "MedicalScheduleBlock" (
    "id" TEXT NOT NULL,
    "doctorUserId" TEXT NOT NULL,
    "type" "MedicalScheduleBlockTypeDb" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "slotDurationMinutes" INTEGER NOT NULL,
    "slotCount" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MedicalScheduleBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MedicalScheduleAppointment" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "patientFirstName" TEXT NOT NULL,
    "patientPaternalSurname" TEXT NOT NULL DEFAULT '',
    "patientMaternalSurname" TEXT NOT NULL DEFAULT '',
    "patientRut" TEXT NOT NULL,
    "patientEmail" TEXT NOT NULL DEFAULT '',
    "patientPhone" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MedicalScheduleAppointment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MedicalScheduleBlock_doctorUserId_startsAt_idx" ON "MedicalScheduleBlock"("doctorUserId", "startsAt");
CREATE INDEX "MedicalScheduleAppointment_patientUserId_createdAt_idx" ON "MedicalScheduleAppointment"("patientUserId", "createdAt");
CREATE UNIQUE INDEX "MedicalScheduleAppointment_blockId_patientUserId_key" ON "MedicalScheduleAppointment"("blockId", "patientUserId");
ALTER TABLE "MedicalScheduleBlock" ADD CONSTRAINT "MedicalScheduleBlock_doctorUserId_fkey" FOREIGN KEY ("doctorUserId") REFERENCES "MedicalPortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalScheduleAppointment" ADD CONSTRAINT "MedicalScheduleAppointment_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "MedicalScheduleBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicalScheduleAppointment" ADD CONSTRAINT "MedicalScheduleAppointment_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
