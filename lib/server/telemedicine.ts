import "server-only";
import { prisma } from "@/lib/prisma";
import { TELEMEDICINE_PRICE_CLP } from "@/lib/clinical/prescription-renewal-protocol";

export async function listTelemedicineSlots() {
  const [blocks, reservations] = await Promise.all([prisma.medicalScheduleBlock.findMany({
    where: { type: "short_consultation", startsAt: { gt: new Date() }, doctor: { active: true } },
    include: { doctor: { select: { id: true, name: true } } },
    orderBy: { startsAt: "asc" }, take: 30,
  }), prisma.telemedicineAppointment.findMany({ where: { startsAt: { gt: new Date() }, status: { in: ["payment_pending", "booked"] } }, select: { clinicianId: true, startsAt: true } })]);
  const occupied = new Set(reservations.map((item) => `${item.clinicianId}:${item.startsAt.toISOString()}`));
  return blocks.flatMap((block) => Array.from({ length: block.slotCount }, (_, index) => {
    const startsAt = new Date(block.startsAt.getTime() + index * block.slotDurationMinutes * 60000);
    return occupied.has(`${block.doctor.id}:${startsAt.toISOString()}`) ? null : { blockId: block.id, clinicianId: block.doctor.id, clinicianName: block.doctor.name, startsAt: startsAt.toISOString(), durationMinutes: 20, priceClp: TELEMEDICINE_PRICE_CLP };
  }).filter(Boolean));
}

export async function reserveTelemedicineSlot(input: { userId: string; clinicianId: string; startsAt: Date; sourceFlow: string; patientData: object }) {
  return prisma.telemedicineAppointment.create({ data: { userId: input.userId, clinicianId: input.clinicianId, startsAt: input.startsAt, durationMinutes: 20, status: "payment_pending", priceClp: TELEMEDICINE_PRICE_CLP, sourceFlow: input.sourceFlow, patientData: input.patientData } });
}
