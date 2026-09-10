import { PaymentStatusDb, SymptomsRequestStatusDb } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  joinPatientFullName,
  splitPatientFullName,
  type PatientDetails,
  type TestItem,
} from "@/lib/checkup";
import {
  EMPTY_SYMPTOMS_ANTECEDENTS,
  type SymptomsAntecedents,
  type SymptomsFlowAnswerMap,
} from "@/lib/symptoms-order";
import type { SymptomsInterpretation } from "@/lib/symptoms-intake";
import {
  parseClinicalState,
  parseInterviewMetadata,
  parseQuestionQueue,
  type InterviewQuestionCandidate,
  type SymptomsClinicalState,
  type SymptomsInterviewMetadata,
} from "@/lib/server/symptoms-clinical-state";

type SymptomsPaymentInfo = {
  amount: number;
  currency: "CLP";
  paymentId: string;
  cardLast4: string;
  cardholder: string;
  status: "pending" | "paid";
  paidAt?: number;
};

export type SymptomsRequestRecord = {
  id: string;
  userId?: string;
  symptomsText: string;
  flowId: string;
  oneLinerSummary: string;
  primarySymptom: string;
  secondarySymptoms: string[];
  patient: PatientDetails & { sex: "female" | "male" | "" };
  antecedents: SymptomsAntecedents;
  interpretation: SymptomsInterpretation;
  followUpQuestions: string[];
  followUpAnswers: SymptomsFlowAnswerMap;
  clinicalState?: SymptomsClinicalState;
  questionQueue: InterviewQuestionCandidate[];
  interviewMetadata?: SymptomsInterviewMetadata;
  suggestedTests: TestItem[];
  selectedTests: TestItem[];
  notes: string[];
  engineVersion: string;
  cachedInput: string;
  aiConsentAt?: number;
  aiConsentVersion?: string;
  aiProvider?: string;
  reviewStatus: "draft" | "paid" | "in_flow" | "pending_validation" | "validated" | "rejected";
  validatedByEmail?: string;
  validatedByUserId?: string;
  validatedByName?: string;
  validatedByRut?: string;
  validatedBySis?: string;
  validatedAt?: number;
  createdAt: number;
  updatedAt: number;
  payment?: SymptomsPaymentInfo;
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item, "").trim())
    .filter(Boolean);
}

function asTests(value: unknown): TestItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const name = asString((item as { name?: unknown }).name).trim();
      const why = asString((item as { why?: unknown }).why).trim();
      if (!name) return null;
      return { name, why: why || "Sugerido por evaluación clínica guiada." };
    })
    .filter((item): item is TestItem => Boolean(item));
}

function asAnswers(value: unknown): SymptomsFlowAnswerMap {
  if (!value || typeof value !== "object") return {};
  return Object.entries(value as Record<string, unknown>).reduce<SymptomsFlowAnswerMap>(
    (acc, [key, raw]) => {
      const normalized = asString(raw).trim();
      if (normalized) {
        acc[key] = normalized;
      }
      return acc;
    },
    {},
  );
}

function asAntecedents(value: unknown): SymptomsAntecedents {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    ...EMPTY_SYMPTOMS_ANTECEDENTS,
    medicalHistory: asString(source.medicalHistory).trim(),
    surgicalHistory: asString(source.surgicalHistory).trim(),
    chronicMedication: asString(source.chronicMedication).trim(),
    allergies: asString(source.allergies).trim(),
    smoking: asString(source.smoking).trim(),
    alcoholUse: asString(source.alcoholUse).trim(),
    drugUse: asString(source.drugUse).trim(),
    sexualActivity: asString(source.sexualActivity).trim(),
    firstDegreeFamilyHistory: asString(source.firstDegreeFamilyHistory).trim(),
    occupation: asString(source.occupation).trim(),
  };
}

function asInterpretation(value: unknown): SymptomsInterpretation {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    flowId: asString(source.flowId).trim() || "fatigue_weight_loss_general_symptoms",
    oneLinerSummary: asString(source.oneLinerSummary).trim() || "Síntomas en evaluación.",
    primarySymptom: asString(source.primarySymptom).trim() || "Síntomas generales",
    secondarySymptoms: asStringArray(source.secondarySymptoms),
    followUpQuestions: asStringArray(source.followUpQuestions),
    probableContext: asString(source.probableContext).trim() || "Evaluación ambulatoria inicial",
    consultationFrame:
      asString(source.consultationFrame).trim() || "Relato clínico inicial en clasificación",
    tags: asStringArray(source.tags),
    urgencyWarning: Boolean(source.urgencyWarning),
    guidanceText:
      asString(source.guidanceText).trim() ||
      "Continuaremos con preguntas dirigidas para precisar el cuadro clínico.",
  };
}

function toPublicStatus(status: SymptomsRequestStatusDb): SymptomsRequestRecord["reviewStatus"] {
  if (status === "paid") return "paid";
  if (status === "in_flow") return "in_flow";
  if (status === "pending_validation") return "pending_validation";
  if (status === "validated") return "validated";
  if (status === "rejected") return "rejected";
  return "draft";
}

function serializePatient(patient: PatientDetails & { sex: "female" | "male" | "" }) {
  const name = splitPatientFullName(patient.fullName);
  return {
    patientFirstName: name.firstName,
    patientPaternalSurname: name.paternalSurname,
    patientMaternalSurname: name.maternalSurname,
    patientRut: patient.rut,
    patientBirthDate: patient.birthDate,
    patientSex: patient.sex,
    patientEmail: patient.email,
    patientPhone: patient.phone,
    patientAddress: patient.address,
  };
}

function getSymptomsRequestDelegate() {
  const delegate = (prisma as unknown as Record<string, unknown>).symptomsRequest as
    | { upsert?: unknown; update?: unknown; findUnique?: unknown; findMany?: unknown; count?: unknown }
    | undefined;
  if (!delegate || typeof delegate.upsert !== "function") {
    throw new Error(
      "PrismaClient desactualizado para síntomas. Reinicia el servidor y ejecuta `npx prisma generate`.",
    );
  }
  return delegate;
}

function toRecord(row: {
  id: string;
  userId: string | null;
  symptomsText: string;
  flowId: string;
  oneLinerSummary: string;
  primarySymptom: string;
  secondarySymptoms: unknown;
  patientFirstName: string;
  patientPaternalSurname: string;
  patientMaternalSurname: string;
  patientRut: string;
  patientBirthDate: string;
  patientSex: string;
  patientEmail: string;
  patientPhone: string;
  patientAddress: string;
  antecedents: unknown;
  interpretation: unknown;
  followUpQuestions: unknown;
  followUpAnswers: unknown;
  clinicalState: unknown | null;
  questionQueue: unknown | null;
  interviewMetadata: unknown | null;
  suggestedTests: unknown;
  selectedTests: unknown;
  notes: unknown;
  engineVersion: string;
  cachedInput: string;
  aiConsentAt: Date | null;
  aiConsentVersion: string | null;
  aiProvider: string | null;
  reviewStatus: SymptomsRequestStatusDb;
  validatedByEmail: string | null;
  validatedByUserId: string | null;
  validatedByName: string | null;
  validatedByRut: string | null;
  validatedBySis: string | null;
  validatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  payment: {
    amount: number;
    currency: string;
    paymentId: string;
    cardLast4: string;
    cardholder: string;
    status: PaymentStatusDb;
    paidAt: Date | null;
  } | null;
}): SymptomsRequestRecord {
  const fullName = joinPatientFullName({
    firstName: row.patientFirstName,
    paternalSurname: row.patientPaternalSurname,
    maternalSurname: row.patientMaternalSurname,
  });

  return {
    id: row.id,
    userId: row.userId ?? undefined,
    symptomsText: row.symptomsText,
    flowId: row.flowId,
    oneLinerSummary: row.oneLinerSummary,
    primarySymptom: row.primarySymptom,
    secondarySymptoms: asStringArray(row.secondarySymptoms),
    patient: {
      fullName,
      rut: row.patientRut,
      birthDate: row.patientBirthDate,
      sex: row.patientSex === "female" || row.patientSex === "male" ? row.patientSex : "",
      email: row.patientEmail,
      phone: row.patientPhone,
      address: row.patientAddress,
    },
    antecedents: asAntecedents(row.antecedents),
    interpretation: asInterpretation(row.interpretation),
    followUpQuestions: asStringArray(row.followUpQuestions),
    followUpAnswers: asAnswers(row.followUpAnswers),
    clinicalState: parseClinicalState(row.clinicalState) ?? undefined,
    questionQueue: parseQuestionQueue(row.questionQueue),
    interviewMetadata: parseInterviewMetadata(row.interviewMetadata) ?? undefined,
    suggestedTests: asTests(row.suggestedTests),
    selectedTests: asTests(row.selectedTests),
    notes: asStringArray(row.notes),
    engineVersion: row.engineVersion,
    cachedInput: row.cachedInput,
    aiConsentAt: row.aiConsentAt?.getTime(),
    aiConsentVersion: row.aiConsentVersion ?? undefined,
    aiProvider: row.aiProvider ?? undefined,
    reviewStatus: toPublicStatus(row.reviewStatus),
    validatedByEmail: row.validatedByEmail ?? undefined,
    validatedByUserId: row.validatedByUserId ?? undefined,
    validatedByName: row.validatedByName ?? undefined,
    validatedByRut: row.validatedByRut ?? undefined,
    validatedBySis: row.validatedBySis ?? undefined,
    validatedAt: row.validatedAt?.getTime(),
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    payment: row.payment
      ? {
          amount: row.payment.amount,
          currency: row.payment.currency as "CLP",
          paymentId: row.payment.paymentId,
          cardLast4: row.payment.cardLast4,
          cardholder: row.payment.cardholder,
          status: row.payment.status,
          paidAt: row.payment.paidAt?.getTime(),
        }
      : undefined,
  };
}

export function buildSymptomsCachedInput(input: {
  sex: string;
  age: number;
  symptomsText: string;
  antecedents: SymptomsAntecedents;
}) {
  return [
    `Sexo: ${input.sex || "No reportado"}`,
    `Edad: ${input.age > 0 ? `${input.age} años` : "No reportada"}`,
    `Síntomas del paciente: ${input.symptomsText || "No reportados"}`,
    `Antecedentes médicos: ${input.antecedents.medicalHistory || "No reportado"}`,
    `Antecedentes quirúrgicos: ${input.antecedents.surgicalHistory || "No reportado"}`,
    `Fármacos: ${input.antecedents.chronicMedication || "No reportado"}`,
    `Alergias: ${input.antecedents.allergies || "No reportado"}`,
    `Tabaco: ${input.antecedents.smoking || "No reportado"}`,
    `Alcohol: ${input.antecedents.alcoholUse || "No reportado"}`,
    `Drogas: ${input.antecedents.drugUse || "No reportado"}`,
    `Actividad sexual: ${input.antecedents.sexualActivity || "No reportado"}`,
    `Antecedentes familiares (1er grado): ${input.antecedents.firstDegreeFamilyHistory || "No reportado"}`,
    `Ocupación: ${input.antecedents.occupation || "No reportado"}`,
  ].join("\n");
}

export async function createOrUpdateSymptomsDraft(input: {
  id: string;
  userId?: string;
  symptomsText: string;
  patient: PatientDetails & { sex: "female" | "male" | "" };
  interpretation: SymptomsInterpretation;
  antecedents: SymptomsAntecedents;
  engineVersion: string;
  cachedInput: string;
  aiConsentAt: Date;
  aiConsentVersion: string;
  aiProvider: string;
  clinicalState: SymptomsClinicalState;
  candidateQuestions: InterviewQuestionCandidate[];
  interviewMetadata: SymptomsInterviewMetadata;
}) {
  const symptomsRequest = getSymptomsRequestDelegate();
  const currentQuestion = input.candidateQuestions[0] ?? null;
  const initialFollowUpQuestions = currentQuestion ? [currentQuestion.question] : [];
  const questionQueue = input.candidateQuestions.slice(1, 3);
  const created = await (symptomsRequest.upsert as (args: unknown) => Promise<unknown>)({
    where: { id: input.id },
    update: {
      userId: input.userId ?? null,
      symptomsText: input.symptomsText,
      flowId: input.interpretation.flowId ?? "",
      oneLinerSummary: input.interpretation.oneLinerSummary,
      primarySymptom: input.interpretation.primarySymptom,
      secondarySymptoms: input.interpretation.secondarySymptoms,
      ...serializePatient(input.patient),
      antecedents: input.antecedents,
      interpretation: input.interpretation,
      followUpQuestions: initialFollowUpQuestions,
      clinicalState: input.clinicalState,
      questionQueue,
      interviewMetadata: input.interviewMetadata,
      engineVersion: input.engineVersion,
      cachedInput: input.cachedInput,
      aiConsentAt: input.aiConsentAt,
      aiConsentVersion: input.aiConsentVersion,
      aiProvider: input.aiProvider,
      reviewStatus: SymptomsRequestStatusDb.draft,
    },
    create: {
      id: input.id,
      userId: input.userId ?? null,
      symptomsText: input.symptomsText,
      flowId: input.interpretation.flowId ?? "",
      oneLinerSummary: input.interpretation.oneLinerSummary,
      primarySymptom: input.interpretation.primarySymptom,
      secondarySymptoms: input.interpretation.secondarySymptoms,
      ...serializePatient(input.patient),
      antecedents: input.antecedents,
      interpretation: input.interpretation,
      followUpQuestions: initialFollowUpQuestions,
      followUpAnswers: {},
      clinicalState: input.clinicalState,
      questionQueue,
      interviewMetadata: input.interviewMetadata,
      suggestedTests: [],
      selectedTests: [],
      notes: [],
      engineVersion: input.engineVersion,
      cachedInput: input.cachedInput,
      aiConsentAt: input.aiConsentAt,
      aiConsentVersion: input.aiConsentVersion,
      aiProvider: input.aiProvider,
      reviewStatus: SymptomsRequestStatusDb.draft,
    },
    include: { payment: true },
  });

  return toRecord(created as Parameters<typeof toRecord>[0]);
}

export async function getSymptomsRequest(id: string) {
  const row = await prisma.symptomsRequest.findUnique({
    where: { id },
    include: { payment: true },
  });

  if (!row) return null;
  return toRecord(row);
}

export async function markSymptomsPaymentPending(input: {
  requestId: string;
  amount: number;
  currency: "CLP";
  paymentId: string;
}) {
  const updated = await prisma.symptomsRequest.update({
    where: { id: input.requestId },
    data: {
      payment: {
        upsert: {
          create: {
            amount: input.amount,
            currency: input.currency,
            paymentId: input.paymentId,
            cardLast4: "0000",
            cardholder: "Pago Webpay Plus",
            status: "pending",
          },
          update: {
            amount: input.amount,
            currency: input.currency,
            paymentId: input.paymentId,
            cardLast4: "0000",
            cardholder: "Pago Webpay Plus",
            status: "pending",
            paidAt: null,
          },
        },
      },
      reviewStatus: SymptomsRequestStatusDb.draft,
    },
    include: { payment: true },
  });

  return toRecord(updated);
}

export async function markSymptomsPaymentPaid(input: {
  requestId: string;
  paymentId: string;
  amount: number;
  cardLast4?: string;
}) {
  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.symptomsRequest.findUnique({
      where: { id: input.requestId },
      include: { payment: true },
    });
    if (!current) throw new Error("Solicitud de síntomas no encontrada.");
    if (current.payment?.status === "paid") return current;
    if (current.reviewStatus === "validated" || current.reviewStatus === "rejected") {
      throw new Error("La solicitud ya fue cerrada y no admite cambios de pago.");
    }
    const now = new Date();
    return tx.symptomsRequest.update({
      where: { id: input.requestId },
      data: {
        payment: {
          upsert: {
            create: {
              amount: input.amount,
              currency: "CLP",
              paymentId: input.paymentId,
              cardLast4: input.cardLast4 ?? "0000",
              cardholder: "Pago Webpay Plus",
              status: "paid",
              paidAt: now,
            },
            update: {
              amount: input.amount,
              currency: "CLP",
              paymentId: input.paymentId,
              cardLast4: input.cardLast4 ?? "0000",
              cardholder: "Pago Webpay Plus",
              status: "paid",
              paidAt: now,
            },
          },
        },
        reviewStatus: SymptomsRequestStatusDb.paid,
      },
      include: { payment: true },
    });
  });

  return toRecord(updated);
}

export async function markSymptomsInFlow(requestId: string) {
  const changed = await prisma.symptomsRequest.updateMany({
    where: {
      id: requestId,
      reviewStatus: { in: [SymptomsRequestStatusDb.paid, SymptomsRequestStatusDb.in_flow] },
      payment: { is: { status: "paid" } },
    },
    data: {
      reviewStatus: SymptomsRequestStatusDb.in_flow,
    },
  });
  if (changed.count !== 1) throw new Error("La solicitud no está pagada o ya fue cerrada.");
  const updated = await prisma.symptomsRequest.findUnique({
    where: { id: requestId },
    include: { payment: true },
  });
  if (!updated) throw new Error("Solicitud de síntomas no encontrada.");
  return toRecord(updated);
}

export async function saveSymptomsInterviewTurn(input: {
  requestId: string;
  expectedQuestionIndex: number;
  answer: string;
  nextQuestion: string;
  oneLinerSummary: string;
  urgencyWarning: boolean;
  urgencyGuidance: string;
  clinicalState: SymptomsClinicalState;
  questionQueue: InterviewQuestionCandidate[];
  interviewMetadata: SymptomsInterviewMetadata;
}) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.symptomsRequest.findUnique({
      where: { id: input.requestId },
      include: { payment: true },
    });
    if (!current) throw new Error("Solicitud de síntomas no encontrada.");
    if (current.payment?.status !== PaymentStatusDb.paid) {
      throw new Error("La solicitud aún no tiene pago confirmado.");
    }
    if (
      current.reviewStatus !== SymptomsRequestStatusDb.paid &&
      current.reviewStatus !== SymptomsRequestStatusDb.in_flow
    ) {
      throw new Error("La entrevista ya fue cerrada y no admite nuevas respuestas.");
    }

    const questions = asStringArray(current.followUpQuestions);
    const answers = asAnswers(current.followUpAnswers);
    const answerKey = `q_${input.expectedQuestionIndex}`;
    const normalizedAnswer = input.answer.trim();
    const existingAnswer = answers[answerKey]?.trim();

    if (existingAnswer) {
      if (existingAnswer === normalizedAnswer) {
        return toRecord(current);
      }
      throw new Error("Esta pregunta ya fue respondida.");
    }

    const nextUnansweredIndex = questions.findIndex((_, index) => !answers[`q_${index}`]?.trim());
    if (
      nextUnansweredIndex < 0 ||
      nextUnansweredIndex !== input.expectedQuestionIndex ||
      !questions[input.expectedQuestionIndex]
    ) {
      throw new Error("La entrevista cambió en otra sesión. Recarga para continuar.");
    }

    const nextAnswers = {
      ...answers,
      [answerKey]: normalizedAnswer,
    };
    const nextQuestions = questions.slice(0, input.expectedQuestionIndex + 1);
    const cleanNextQuestion = input.nextQuestion.trim();
    if (cleanNextQuestion) {
      nextQuestions.push(cleanNextQuestion);
    }

    const currentInterpretation = asInterpretation(current.interpretation);
    const urgencyWarning = currentInterpretation.urgencyWarning || input.urgencyWarning;
    const updatedInterpretation: SymptomsInterpretation = {
      ...currentInterpretation,
      oneLinerSummary: input.oneLinerSummary.trim() || currentInterpretation.oneLinerSummary,
      urgencyWarning,
      guidanceText:
        urgencyWarning && input.urgencyGuidance.trim()
          ? input.urgencyGuidance.trim()
          : currentInterpretation.guidanceText,
    };

    const changed = await tx.symptomsRequest.updateMany({
      where: {
        id: input.requestId,
        updatedAt: current.updatedAt,
        reviewStatus: { in: [SymptomsRequestStatusDb.paid, SymptomsRequestStatusDb.in_flow] },
        payment: { is: { status: PaymentStatusDb.paid } },
      },
      data: {
        followUpQuestions: nextQuestions,
        followUpAnswers: nextAnswers,
        oneLinerSummary: updatedInterpretation.oneLinerSummary,
        interpretation: updatedInterpretation,
        clinicalState: input.clinicalState,
        questionQueue: input.questionQueue,
        interviewMetadata: input.interviewMetadata,
        reviewStatus: SymptomsRequestStatusDb.in_flow,
      },
    });
    if (changed.count !== 1) {
      throw new Error("La entrevista cambió en otra sesión. Recarga para continuar.");
    }

    const updated = await tx.symptomsRequest.findUnique({
      where: { id: input.requestId },
      include: { payment: true },
    });
    if (!updated) throw new Error("Solicitud de síntomas no encontrada.");
    return toRecord(updated);
  });
}

export async function saveSymptomsOrderDraft(input: {
  requestId: string;
  followUpAnswers: SymptomsFlowAnswerMap;
  suggestedTests: TestItem[];
  notes: string[];
  oneLinerSummary?: string;
  interviewMetadata?: SymptomsInterviewMetadata;
}) {
  const changed = await prisma.symptomsRequest.updateMany({
    where: {
      id: input.requestId,
      reviewStatus: { in: [SymptomsRequestStatusDb.paid, SymptomsRequestStatusDb.in_flow] },
      payment: { is: { status: "paid" } },
    },
    data: {
      followUpAnswers: input.followUpAnswers,
      suggestedTests: input.suggestedTests,
      selectedTests: input.suggestedTests,
      notes: input.notes,
      interviewMetadata: input.interviewMetadata,
      oneLinerSummary: input.oneLinerSummary || undefined,
      reviewStatus: SymptomsRequestStatusDb.pending_validation,
    },
  });
  if (changed.count !== 1) throw new Error("Transición clínica inválida para construir la orden.");
  const updated = await prisma.symptomsRequest.findUnique({
    where: { id: input.requestId },
    include: { payment: true },
  });
  if (!updated) throw new Error("Solicitud de síntomas no encontrada.");
  return toRecord(updated);
}

export async function validateSymptomsOrder(input: {
  requestId: string;
  doctorUserId: string;
  doctorEmail: string;
  doctorName: string;
  doctorRut: string;
  doctorSis: string;
  selectedTests: TestItem[];
}) {
  const current = await prisma.symptomsRequest.findUnique({
    where: { id: input.requestId },
    include: { payment: true },
  });
  if (!current) throw new Error("Solicitud de síntomas no encontrada.");
  if (current.reviewStatus === SymptomsRequestStatusDb.validated) {
    if (current.validatedByUserId !== input.doctorUserId) {
      throw new Error("La orden ya fue validada por otro médico.");
    }
    return toRecord(current);
  }
  const changed = await prisma.symptomsRequest.updateMany({
    where: {
      id: input.requestId,
      reviewStatus: SymptomsRequestStatusDb.pending_validation,
      payment: { is: { status: "paid" } },
    },
    data: {
      selectedTests: input.selectedTests,
      reviewStatus: SymptomsRequestStatusDb.validated,
      validatedByEmail: input.doctorEmail.trim().toLowerCase(),
      validatedByUserId: input.doctorUserId,
      validatedByName: input.doctorName.trim(),
      validatedByRut: input.doctorRut.trim(),
      validatedBySis: input.doctorSis.trim(),
      validatedAt: new Date(),
    },
  });
  if (changed.count !== 1) throw new Error("La orden no está pendiente de validación médica.");
  const updated = await prisma.symptomsRequest.findUnique({
    where: { id: input.requestId },
    include: { payment: true },
  });
  if (!updated) throw new Error("Solicitud de síntomas no encontrada.");
  return toRecord(updated);
}

export async function listPendingSymptomsForPortal() {
  const rows = await prisma.symptomsRequest.findMany({
    where: {
      reviewStatus: SymptomsRequestStatusDb.pending_validation,
    },
    include: { payment: true },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => toRecord(row));
}

export async function listValidatedSymptomsByDoctor(params: {
  doctorEmail: string;
  year: number;
  month: number;
}) {
  const start = new Date(params.year, params.month - 1, 1, 0, 0, 0, 0);
  const end = new Date(params.year, params.month, 1, 0, 0, 0, 0);

  const rows = await prisma.symptomsRequest.findMany({
    where: {
      reviewStatus: SymptomsRequestStatusDb.validated,
      validatedByEmail: params.doctorEmail.trim().toLowerCase(),
      validatedAt: {
        gte: start,
        lt: end,
      },
    },
    include: { payment: true },
    orderBy: { validatedAt: "desc" },
  });

  return rows.map((row) => toRecord(row));
}

export async function countValidatedSymptomsByDoctor(params: {
  doctorEmail: string;
  year: number;
  month: number;
}) {
  const start = new Date(params.year, params.month - 1, 1, 0, 0, 0, 0);
  const end = new Date(params.year, params.month, 1, 0, 0, 0, 0);
  return prisma.symptomsRequest.count({
    where: {
      reviewStatus: SymptomsRequestStatusDb.validated,
      validatedByEmail: params.doctorEmail.trim().toLowerCase(),
      validatedAt: {
        gte: start,
        lt: end,
      },
    },
  });
}
