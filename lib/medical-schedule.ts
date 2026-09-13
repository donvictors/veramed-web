import { z } from "zod";

export const scheduleBlockTypes = [
  "short_consultation",
  "follow_up",
  "intake",
  "home_visit",
  "blocked",
] as const;

export type ScheduleBlockType = (typeof scheduleBlockTypes)[number];

export const scheduleBlockLabels: Record<ScheduleBlockType, string> = {
  short_consultation: "Consulta breve",
  follow_up: "Control",
  intake: "Ingreso",
  home_visit: "Visita domiciliaria",
  blocked: "Bloqueo de agenda",
};

export const scheduleBlockSchema = z.object({
  type: z.enum(scheduleBlockTypes),
  startsAt: z.iso.datetime({ offset: true }),
  slotDurationMinutes: z.number().int().min(5).max(480),
  slotCount: z.number().int().min(1).max(24),
  notes: z.string().trim().max(500).default(""),
});

export const scheduleAppointmentSchema = z.object({
  rut: z.string().trim().min(7).max(20),
  notes: z.string().trim().max(500).default(""),
});

export type ScheduleBlockInput = z.infer<typeof scheduleBlockSchema>;

