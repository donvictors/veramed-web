import "server-only";

import { MedicalScheduleBlockTypeDb, Prisma } from "@prisma/client";
import { formatRut, isValidRut, normalizeRut } from "@/lib/checkup";
import type { ScheduleBlockInput } from "@/lib/medical-schedule";
import { prisma } from "@/lib/prisma";
import { HttpRequestError } from "@/lib/server/http-security";

const MAX_RANGE_MS = 46 * 24 * 60 * 60 * 1000;

function blockEnd(block: { startsAt: Date; slotDurationMinutes: number; slotCount: number }) {
  return new Date(block.startsAt.getTime() + block.slotDurationMinutes * block.slotCount * 60_000);
}

function serializeBlock(block: Prisma.MedicalScheduleBlockGetPayload<{ include: { appointments: true } }>) {
  return {
    id: block.id,
    type: block.type,
    startsAt: block.startsAt.toISOString(),
    endsAt: blockEnd(block).toISOString(),
    slotDurationMinutes: block.slotDurationMinutes,
    slotCount: block.slotCount,
    notes: block.notes,
    appointments: block.appointments
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((appointment, index) => ({
        id: appointment.id,
        patientUserId: appointment.patientUserId,
        patientName: [
          appointment.patientFirstName,
          appointment.patientPaternalSurname,
          appointment.patientMaternalSurname,
        ].filter(Boolean).join(" "),
        patientRut: appointment.patientRut,
        patientEmail: appointment.patientEmail,
        patientPhone: appointment.patientPhone,
        notes: appointment.notes,
        startsAt: new Date(block.startsAt.getTime() + index * block.slotDurationMinutes * 60_000).toISOString(),
      })),
  };
}

export async function listScheduleBlocks(doctorUserId: string, from: Date, to: Date) {
  if (!(from < to) || to.getTime() - from.getTime() > MAX_RANGE_MS) {
    throw new HttpRequestError("El rango de agenda no es válido.", 400);
  }
  const blocks = await prisma.medicalScheduleBlock.findMany({
    where: { doctorUserId, startsAt: { gte: from, lt: to } },
    orderBy: { startsAt: "asc" },
    include: { appointments: true },
  });
  return blocks.map(serializeBlock);
}

async function assertNoOverlap(doctorUserId: string, input: ScheduleBlockInput, exceptId?: string) {
  const startsAt = new Date(input.startsAt);
  const endsAt = blockEnd({
    startsAt,
    slotDurationMinutes: input.slotDurationMinutes,
    slotCount: input.slotCount,
  });
  const dayStart = new Date(startsAt.getTime() - 24 * 60 * 60 * 1000);
  const dayEnd = new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);
  const existing = await prisma.medicalScheduleBlock.findMany({
    where: {
      doctorUserId,
      startsAt: { gte: dayStart, lt: dayEnd },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { startsAt: true, slotDurationMinutes: true, slotCount: true },
  });
  if (existing.some((block) => block.startsAt < endsAt && blockEnd(block) > startsAt)) {
    throw new HttpRequestError("Ese horario se superpone con otro bloque de tu agenda.", 409);
  }
}

export async function createScheduleBlock(doctorUserId: string, input: ScheduleBlockInput) {
  if (new Date(input.startsAt).getTime() < Date.now() - 24 * 60 * 60 * 1000) {
    throw new HttpRequestError("No puedes crear un bloque en una fecha pasada.", 400);
  }
  const normalized = input.type === "blocked" ? { ...input, slotCount: 1 } : input;
  await assertNoOverlap(doctorUserId, normalized);
  const block = await prisma.medicalScheduleBlock.create({
    data: {
      doctorUserId,
      type: normalized.type as MedicalScheduleBlockTypeDb,
      startsAt: new Date(normalized.startsAt),
      slotDurationMinutes: normalized.slotDurationMinutes,
      slotCount: normalized.slotCount,
      notes: normalized.notes,
    },
    include: { appointments: true },
  });
  return serializeBlock(block);
}

export async function updateScheduleBlock(doctorUserId: string, id: string, input: ScheduleBlockInput) {
  const current = await prisma.medicalScheduleBlock.findFirst({
    where: { id, doctorUserId },
    include: { appointments: true },
  });
  if (!current) throw new HttpRequestError("Bloque no encontrado.", 404);
  const normalized = input.type === "blocked" ? { ...input, slotCount: 1 } : input;
  if (normalized.type === "blocked" && current.appointments.length > 0) {
    throw new HttpRequestError("Retira los pacientes antes de convertir el bloque en bloqueo.", 409);
  }
  if (normalized.slotCount < current.appointments.length) {
    throw new HttpRequestError("El bloque no puede tener menos cupos que pacientes citados.", 409);
  }
  await assertNoOverlap(doctorUserId, normalized, id);
  const block = await prisma.medicalScheduleBlock.update({
    where: { id },
    data: {
      type: normalized.type as MedicalScheduleBlockTypeDb,
      startsAt: new Date(normalized.startsAt),
      slotDurationMinutes: normalized.slotDurationMinutes,
      slotCount: normalized.slotCount,
      notes: normalized.notes,
    },
    include: { appointments: true },
  });
  return serializeBlock(block);
}

export async function deleteScheduleBlock(doctorUserId: string, id: string) {
  const deleted = await prisma.medicalScheduleBlock.deleteMany({ where: { id, doctorUserId } });
  if (!deleted.count) throw new HttpRequestError("Bloque no encontrado.", 404);
}

export async function addScheduleAppointment(doctorUserId: string, blockId: string, rut: string, notes: string) {
  if (!isValidRut(rut)) throw new HttpRequestError("Ingresa un RUT válido.", 400);
  const block = await prisma.medicalScheduleBlock.findFirst({
    where: { id: blockId, doctorUserId },
    include: { appointments: true },
  });
  if (!block) throw new HttpRequestError("Bloque no encontrado.", 404);
  if (block.type === "blocked") throw new HttpRequestError("No puedes añadir pacientes a un bloqueo.", 409);
  if (block.appointments.length >= block.slotCount) throw new HttpRequestError("Este bloque ya no tiene cupos disponibles.", 409);
  const formattedRut = formatRut(normalizeRut(rut));
  const patient = await prisma.user.findFirst({
    where: { profileRut: formattedRut },
    select: {
      id: true,
      profileFirstName: true,
      profilePaternalSurname: true,
      profileMaternalSurname: true,
      profileRut: true,
      profileEmail: true,
      profilePhone: true,
    },
  });
  if (!patient) throw new HttpRequestError("No encontramos una cuenta de paciente con ese RUT.", 404);
  try {
    await prisma.medicalScheduleAppointment.create({
      data: {
        blockId,
        patientUserId: patient.id,
        patientFirstName: patient.profileFirstName,
        patientPaternalSurname: patient.profilePaternalSurname,
        patientMaternalSurname: patient.profileMaternalSurname,
        patientRut: patient.profileRut,
        patientEmail: patient.profileEmail,
        patientPhone: patient.profilePhone,
        notes,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpRequestError("Ese paciente ya está citado en este bloque.", 409);
    }
    throw error;
  }
}

export async function removeScheduleAppointment(doctorUserId: string, blockId: string, appointmentId: string) {
  const appointment = await prisma.medicalScheduleAppointment.findFirst({
    where: { id: appointmentId, blockId, block: { doctorUserId } },
    select: { id: true },
  });
  if (!appointment) throw new HttpRequestError("Cita no encontrada.", 404);
  await prisma.medicalScheduleAppointment.delete({ where: { id: appointment.id } });
}
