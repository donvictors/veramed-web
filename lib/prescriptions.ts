import { z } from "zod";

export const PRESCRIPTION_DOSE_UNITS = [
  "comprimido(s)",
  "cápsula(s)",
  "ml",
  "gota(s)",
  "aplicación(es)",
  "unidad(es)",
] as const;

export const PRESCRIPTION_FREQUENCY_UNITS = [
  "horas",
  "veces al día",
  "días",
  "semanas",
] as const;

export const PRESCRIPTION_DURATION_UNITS = [
  "días",
  "semanas",
  "meses",
  "Permanente",
  "SOS",
] as const;

const shortText = (max: number) => z.string().trim().max(max);
const positiveDecimal = z
  .string()
  .trim()
  .regex(/^\d+(?:[.,]\d{1,3})?$/, "Ingresa un número válido distinto de cero.")
  .refine((value) => Number(value.replace(",", ".")) > 0, "El valor debe ser mayor que cero.");

export const prescriptionItemSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    name: z.string().trim().min(2).max(180),
    commercial: shortText(180).default(""),
    dose: positiveDecimal,
    doseUnit: z.enum(PRESCRIPTION_DOSE_UNITS),
    frequency: positiveDecimal,
    frequencyUnit: z.enum(PRESCRIPTION_FREQUENCY_UNITS),
    duration: shortText(20).default(""),
    durationUnit: z.enum(PRESCRIPTION_DURATION_UNITS),
    startDate: z.iso.date(),
    observations: shortText(800).default(""),
  })
  .superRefine((item, context) => {
    if (!['Permanente', 'SOS'].includes(item.durationUnit)) {
      const result = positiveDecimal.safeParse(item.duration);
      if (!result.success) {
        context.addIssue({
          code: "custom",
          path: ["duration"],
          message: "Completa la duración del tratamiento.",
        });
      }
    }
  });

export const prescriptionPatientSchema = z.object({
  userId: z.string().trim().min(1).max(100),
  firstName: z.string().trim().min(2).max(100),
  paternalSurname: shortText(100).default(""),
  maternalSurname: shortText(100).default(""),
  rut: z.string().trim().min(8).max(20),
  birthDate: z.iso.date(),
  email: z.email().trim().toLowerCase(),
  phone: shortText(40).default(""),
  address: shortText(300).default(""),
});

export const issuePrescriptionSchema = z.object({
  patient: prescriptionPatientSchema,
  items: z.array(prescriptionItemSchema).min(1).max(12),
  confirmation: z.literal(true),
});

export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;
export type PrescriptionPatientInput = z.infer<typeof prescriptionPatientSchema>;

export function prescriptionPatientFullName(patient: {
  firstName: string;
  paternalSurname?: string;
  maternalSurname?: string;
}) {
  return [patient.firstName, patient.paternalSurname, patient.maternalSurname]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");
}

export function prescriptionInstruction(item: PrescriptionItemInput) {
  const duration = ["Permanente", "SOS"].includes(item.durationUnit)
    ? item.durationUnit
    : `${item.duration} ${item.durationUnit}`;
  return `${item.dose} ${item.doseUnit} cada ${item.frequency} ${item.frequencyUnit}, por ${duration}.`;
}
