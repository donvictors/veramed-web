import "server-only";

import { z } from "zod";
import { formatRut, isValidRut, normalizeRut } from "@/lib/checkup";
import {
  ANTIEPILEPTIC_OPTIONS,
  CONDITION_OPTIONS,
  MEDICATION_OPTIONS,
} from "@/lib/chronic-control";

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalTrimmed = (max: number) => z.string().trim().max(max).default("");

const isoBirthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return false;
    const ageMs = Date.now() - date.getTime();
    return ageMs >= 0 && ageMs <= 125 * 365.25 * 24 * 60 * 60 * 1000;
  }, "Fecha de nacimiento inválida.");

export const patientSchema = z.object({
  fullName: trimmed(2, 160),
  rut: z
    .string()
    .trim()
    .max(20)
    .refine(isValidRut, "RUT inválido.")
    .transform((value) => formatRut(normalizeRut(value))),
  birthDate: isoBirthDateSchema,
  email: z.union([z.literal(""), z.email().max(254)]).default(""),
  phone: optionalTrimmed(30),
  address: optionalTrimmed(300),
});

export const checkupInputSchema = z
  .object({
    age: z.number().int().min(0).max(125),
    sex: z.enum(["M", "F"]),
    weightKg: z.number().min(20).max(400),
    heightCm: z.number().min(80).max(250),
    bodyMassIndex: z.number().min(5).max(100).optional(),
    smoking: z.enum(["never", "former", "current"]),
    cigarettesPerDay: z.number().int().min(0).max(200).optional(),
    smokingYears: z.number().min(0).max(100).optional(),
    packYearIndex: z.number().min(0).max(500).optional(),
    quitSmokingYearsAgo: z.number().min(0).max(100).optional(),
    stiScreening: z.enum(["yes", "no"]).optional(),
    sexualActivity: z.enum(["yes", "no"]).optional(),
    pregnancy: z.enum(["yes", "no"]),
    gestationWeeks: z.number().int().min(0).max(45).optional(),
    dietaryRestriction: z.enum(["none", "special"]).optional(),
    dietaryPatterns: z
      .array(z.enum(["vegan", "vegetarian", "ketogenic", "gluten_free"]))
      .max(4)
      .optional(),
  })
  .strict();

export const createCheckupSchema = z
  .object({
    input: checkupInputSchema,
    patient: patientSchema,
  })
  .strict();

export const createChronicControlSchema = z
  .object({
    conditions: z.array(z.enum(CONDITION_OPTIONS)).min(1).max(CONDITION_OPTIONS.length),
    patient: patientSchema,
    yearsSinceDiagnosis: z.number().int().min(0).max(125),
    hasRecentChanges: z.boolean(),
    usesMedication: z.boolean(),
    selectedMedications: z.array(z.enum(MEDICATION_OPTIONS)).max(MEDICATION_OPTIONS.length),
    selectedAntiepileptics: z
      .array(z.enum(ANTIEPILEPTIC_OPTIONS))
      .max(ANTIEPILEPTIC_OPTIONS.length)
      .optional()
      .default([]),
    generalCheckupInput: checkupInputSchema.optional(),
  })
  .strict();

export const symptomsAntecedentsSchema = z
  .object({
    medicalHistory: optionalTrimmed(1_000),
    surgicalHistory: optionalTrimmed(1_000),
    chronicMedication: optionalTrimmed(1_000),
    allergies: optionalTrimmed(1_000),
    smoking: optionalTrimmed(500),
    alcoholUse: optionalTrimmed(500),
    drugUse: optionalTrimmed(500),
    sexualActivity: optionalTrimmed(500),
    firstDegreeFamilyHistory: optionalTrimmed(1_000),
    occupation: optionalTrimmed(300),
  })
  .strict();

export const interpretSymptomsSchema = z
  .object({
    symptomsText: trimmed(12, 4_000),
    patient: patientSchema,
    antecedents: symptomsAntecedentsSchema.partial().optional().default({}),
    patientContext: z
      .object({
        sex: z.enum(["female", "male", ""]).optional(),
        age: z.number().int().min(0).max(125).optional(),
      })
      .strict()
      .optional(),
    consentToAiProcessing: z.literal(true),
  })
  .strict();
