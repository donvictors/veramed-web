import {
  createOrderId,
  joinPatientFullName,
  splitPatientFullName,
  type PatientDetails,
  type StoredCheckupStatus,
  type StoredPayment,
} from "@/lib/checkup";
import { PaymentStatusDb, ReviewStatusDb } from "@prisma/client";
import {
  recommendMultipleChronicControls,
  type AntiepilepticOption,
  type ChronicCondition,
  type ChronicControlRecommendation,
  type MedicationOption,
} from "@/lib/chronic-control";
import { type CheckupInput } from "@/lib/checkup";
import { prisma } from "@/lib/prisma";
import { sendApprovedOrderEmail } from "@/lib/server/order-ready-email";

type ChronicControlRecord = {
  id: string;
  userId?: string;
  createdAt: number;
  updatedAt: number;
  conditions: ChronicCondition[];
  patient: PatientDetails;
  yearsSinceDiagnosis: number;
  hasRecentChanges: boolean;
  usesMedication: boolean;
  selectedMedications: MedicationOption[];
  selectedAntiepileptics?: AntiepilepticOption[];
  rec: ChronicControlRecommendation;
  payment: {
    pending: StoredPayment | null;
    confirmed: StoredPayment | null;
  };
  status: StoredCheckupStatus;
};

type ChronicControlRow = {
  id: string;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
  conditions: unknown;
  patientFirstName: string;
  patientPaternalSurname: string;
  patientMaternalSurname: string;
  patientRut: string;
  patientBirthDate: string;
  patientEmail: string;
  patientPhone: string;
  patientAddress: string;
  yearsSinceDiagnosis: number;
  hasRecentChanges: boolean;
  usesMedication: boolean;
  selectedMedications: unknown;
  rec: unknown;
  reviewStatus: ReviewStatusDb;
  queuedAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  orderId: string | null;
  payment: {
    amount: number;
    currency: string;
    paymentId: string;
    cardLast4: string;
    cardholder: string;
    status: PaymentStatusDb;
    paidAt: Date | null;
  } | null;
};

const REVIEW_DELAY_MS = 8000;

function createRequestId(timestamp = Date.now()) {
  return `chr_${timestamp.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function serializePatientForDb(patient: PatientDetails) {
  const nameFields = splitPatientFullName(patient.fullName);
  return {
    patientFirstName: nameFields.firstName,
    patientPaternalSurname: nameFields.paternalSurname,
    patientMaternalSurname: nameFields.maternalSurname,
    patientRut: patient.rut,
    patientBirthDate: patient.birthDate,
    patientEmail: patient.email,
    patientPhone: patient.phone,
    patientAddress: patient.address,
  };
}

function fromRow(row: ChronicControlRow): ChronicControlRecord {
  const payment =
    row.payment?.status === "pending"
      ? {
          pending: {
            paid: false,
            amount: row.payment.amount,
            currency: row.payment.currency as "CLP",
            paidAt: 0,
            paymentId: row.payment.paymentId,
            cardLast4: row.payment.cardLast4,
            cardholder: row.payment.cardholder,
          },
          confirmed: null,
        }
      : row.payment
        ? {
            pending: null,
            confirmed: {
              paid: true,
              amount: row.payment.amount,
              currency: row.payment.currency as "CLP",
              paidAt: row.payment.paidAt?.getTime() ?? 0,
              paymentId: row.payment.paymentId,
              cardLast4: row.payment.cardLast4,
              cardholder: row.payment.cardholder,
            },
          }
        : {
            pending: null,
            confirmed: null,
          };

  return {
    id: row.id,
    userId: row.userId ?? undefined,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    conditions: row.conditions as ChronicCondition[],
    patient: {
      fullName: joinPatientFullName({
        firstName: row.patientFirstName,
        paternalSurname: row.patientPaternalSurname,
        maternalSurname: row.patientMaternalSurname,
      }),
      rut: row.patientRut,
      birthDate: row.patientBirthDate,
      email: row.patientEmail,
      phone: row.patientPhone,
      address: row.patientAddress,
    },
    yearsSinceDiagnosis: row.yearsSinceDiagnosis,
    hasRecentChanges: row.hasRecentChanges,
    usesMedication: row.usesMedication,
    selectedMedications: row.selectedMedications as MedicationOption[],
    selectedAntiepileptics: [],
    rec: row.rec as ChronicControlRecommendation,
    payment,
    status: {
      status:
        row.reviewStatus === "approved"
          ? "approved"
          : row.reviewStatus === "rejected"
            ? "rejected"
            : "queued",
      queuedAt: row.queuedAt?.getTime(),
      approvedAt: row.approvedAt?.getTime(),
      rejectedAt: row.rejectedAt?.getTime(),
      orderId: row.orderId ?? undefined,
    },
  };
}

function shouldAutoApprove(record: ChronicControlRecord) {
  return (
    record.status.status === "queued" &&
    Boolean(record.status.queuedAt) &&
    Date.now() - (record.status.queuedAt ?? 0) >= REVIEW_DELAY_MS
  );
}

async function resolveStatus(record: ChronicControlRecord) {
  const shouldApproveNow = shouldAutoApprove(record);
  const shouldCheckMissingEmail = record.status.status === "approved";

  if (!shouldApproveNow && !shouldCheckMissingEmail) {
    return record;
  }

  if (shouldApproveNow) {
    const approvedAt = record.status.approvedAt ?? Date.now();
    await prisma.chronicControlRequest.updateMany({
      where: {
        id: record.id,
        reviewStatus: "queued",
      },
      data: {
        reviewStatus: "approved",
        approvedAt: new Date(approvedAt),
      },
    });
  }

  const updated = await prisma.chronicControlRequest.findUnique({
    where: { id: record.id },
    include: { payment: true },
  });

  if (!updated) {
    return record;
  }

  const shouldSendEmail =
    updated.reviewStatus === "approved" &&
    updated.payment?.status === "paid" &&
    !updated.orderEmailSentAt;

  if (shouldSendEmail) {
    try {
      await sendApprovedOrderEmail({
        requestType: "chronic_control",
        requestId: updated.id,
      });
    } catch (error) {
      console.error("No pudimos enviar el correo de orden aprobada (control crónico)", {
        requestId: updated.id,
        error,
      });
    }
  }

  return fromRow(updated);
}

export async function createChronicControlRecord(payload: {
  userId?: string;
  conditions: ChronicCondition[];
  patient: PatientDetails;
  yearsSinceDiagnosis: number;
  hasRecentChanges: boolean;
  usesMedication: boolean;
  selectedMedications: MedicationOption[];
  selectedAntiepileptics?: AntiepilepticOption[];
  generalCheckupInput?: CheckupInput;
}) {
  const conditions: ChronicCondition[] =
    payload.conditions.length > 0 ? payload.conditions : ["hypertension"];
  const rec = recommendMultipleChronicControls(
    conditions,
    payload.hasRecentChanges,
    payload.usesMedication,
    payload.selectedMedications,
    payload.selectedAntiepileptics ?? [],
    payload.generalCheckupInput,
  );

  const record = await prisma.chronicControlRequest.create({
    data: {
      id: createRequestId(),
      userId: payload.userId ?? null,
      conditions,
      ...serializePatientForDb(payload.patient),
      yearsSinceDiagnosis: payload.yearsSinceDiagnosis,
      hasRecentChanges: payload.hasRecentChanges,
      usesMedication: payload.usesMedication,
      selectedMedications: payload.selectedMedications,
      rec,
    },
    include: { payment: true },
  });

  return fromRow(record);
}

export async function getChronicControlRecord(id: string) {
  const record = await prisma.chronicControlRequest.findUnique({
    where: { id },
    include: { payment: true },
  });

  if (!record) {
    return null;
  }

  return resolveStatus(fromRow(record));
}

export async function createChronicPendingPayment(
  id: string,
  payment: Omit<StoredPayment, "paid" | "paidAt">,
) {
  const current = await prisma.chronicControlRequest.findUnique({
    where: { id },
    include: { payment: true },
  });

  if (!current) {
    return null;
  }

  const nextPayment: StoredPayment = {
    ...payment,
    paid: false,
    paidAt: 0,
  };

  const updated = await prisma.chronicControlRequest.update({
    where: { id },
    data: {
      payment: current.payment
        ? {
            update: {
              amount: nextPayment.amount,
              currency: nextPayment.currency,
              paymentId: nextPayment.paymentId,
              cardLast4: nextPayment.cardLast4,
              cardholder: nextPayment.cardholder,
              status: "pending",
              paidAt: null,
            },
          }
        : {
            create: {
              amount: nextPayment.amount,
              currency: nextPayment.currency,
              paymentId: nextPayment.paymentId,
              cardLast4: nextPayment.cardLast4,
              cardholder: nextPayment.cardholder,
              status: "pending",
            },
          },
    },
    include: { payment: true },
  });

  return fromRow(updated);
}

export async function updateChronicControlScreeningPreferences(
  id: string,
  preferences: {
    colorectalMethod?: "fit" | "colonoscopy";
    cervicalMethod?: "pap" | "hpv" | "cotesting";
    bloodPressureMethod?: "mapa" | "skip";
    breastImaging?: "mammo_only" | "mammo_plus_ultrasound";
    prostateMethod?: "include" | "skip";
    addTestName?: string;
    removeTestName?: string;
    restoreTestName?: string;
  },
) {
  const current = await prisma.chronicControlRequest.findUnique({
    where: { id },
    include: { payment: true },
  });

  if (!current) {
    return null;
  }

  const record = fromRow(current);
  let nextTests = [...record.rec.tests];
  let nextRemovedTests = [...(record.rec.removedTests ?? [])];

  if (preferences.colorectalMethod) {
    const colorectalNames = new Set([
      "Tamizaje de cáncer colorrectal",
      "Test inmunológico de sangre oculta en deposiciones",
      "Colonoscopía total",
    ]);
    const nextColorectalName =
      preferences.colorectalMethod === "fit"
        ? "Test inmunológico de sangre oculta en deposiciones"
        : "Colonoscopía total";
    const nextColorectalWhy =
      "Indicamos tamizaje de cáncer colorrectal a todas las personas de 45 años o más. Se incluye el método de tu elección realizada en la parte superior.";
    let replaced = false;

    nextTests = nextTests.map((test) => {
      if (!colorectalNames.has(test.name)) {
        return test;
      }

      replaced = true;
      return {
        name: nextColorectalName,
        why: nextColorectalWhy,
      };
    });

    if (!replaced) {
      nextTests.push({
        name: nextColorectalName,
        why: nextColorectalWhy,
      });
    }

    nextRemovedTests = nextRemovedTests.filter((test) => !colorectalNames.has(test.name));
  }

  if (preferences.cervicalMethod) {
    const cervicalNames = new Set([
      "Tamizaje de cáncer cervicouterino",
      "Papanicolau",
      "Papanicolau (PAP)",
      "Test de VPH (HPV)",
      "PCR de virus papiloma humano (VPH)",
      "Cotesting (PAP+VPH)",
    ]);
    const nextCervicalWhy =
      "Indicamos tamizaje de cáncer cervicouterino a todas las personas de sexo femenino entre 21 y 65 años. Se incluye el método de tu elección realizada en la parte superior.";
    const baseTests = nextTests.filter((test) => !cervicalNames.has(test.name));
    let nextCervicalTests: typeof nextTests = [];

    if (preferences.cervicalMethod === "pap") {
      nextCervicalTests = [
        {
          name: "Papanicolau (PAP)",
          why: nextCervicalWhy,
        },
      ];
    } else if (preferences.cervicalMethod === "hpv") {
      nextCervicalTests = [
        {
          name: "PCR de virus papiloma humano (VPH)",
          why: nextCervicalWhy,
        },
      ];
    } else {
      nextCervicalTests = [
        {
          name: "Papanicolau (PAP)",
          why: nextCervicalWhy,
        },
        {
          name: "PCR de virus papiloma humano (VPH)",
          why: nextCervicalWhy,
        },
      ];
    }

    nextTests = [...baseTests, ...nextCervicalTests];
    nextRemovedTests = nextRemovedTests.filter((test) => !cervicalNames.has(test.name));
  }

  if (preferences.breastImaging) {
    const mammographyName = "Mamografía bilateral";
    const ultrasoundName = "Ecografía mamaria";
    const legacyBreastName = "Tamizaje de cáncer de mama";
    const mammographyWhy =
      "Indicamos tamizaje de cáncer de mama a personas de sexo femenino entre 40 y 74 años. Se mantiene mamografía bilateral como examen base.";
    const ultrasoundWhy =
      "Se agrega como complemento opcional si deseas sumar una ecografía mamaria a la mamografía bilateral.";

    if (
      !nextTests.some((test) => test.name === mammographyName || test.name === legacyBreastName)
    ) {
      nextTests.push({
        name: mammographyName,
        why: mammographyWhy,
      });
    } else {
      nextTests = nextTests.map((test) =>
        test.name === mammographyName || test.name === legacyBreastName
          ? {
              name: mammographyName,
              why: mammographyWhy,
            }
          : test,
      );
    }

    if (preferences.breastImaging === "mammo_plus_ultrasound") {
      nextRemovedTests = nextRemovedTests.filter(
        (test) => test.name !== ultrasoundName && test.name !== legacyBreastName,
      );
      if (!nextTests.some((test) => test.name === ultrasoundName)) {
        nextTests.push({
          name: ultrasoundName,
          why: ultrasoundWhy,
        });
      }
    } else {
      const removed = nextTests.find((test) => test.name === ultrasoundName);
      nextTests = nextTests.filter((test) => test.name !== ultrasoundName);
      if (removed && !nextRemovedTests.some((test) => test.name === ultrasoundName)) {
        nextRemovedTests.push(removed);
      }
    }
  }

  if (preferences.bloodPressureMethod) {
    const bloodPressureName = "Holter de presión arterial (MAPA)";
    const bloodPressureWhy =
      "Indicamos tamizaje de presión arterial una vez al año en todas las personas mayores de 18 años. Se mantiene el Holter de presión arterial (MAPA) como método incluido en tu orden.";
    const hasBloodPressureTest = nextTests.some((test) => test.name === bloodPressureName);

    if (preferences.bloodPressureMethod === "skip") {
      const removed = nextTests.find((test) => test.name === bloodPressureName);
      nextTests = nextTests.filter((test) => test.name !== bloodPressureName);
      if (removed && !nextRemovedTests.some((test) => test.name === removed.name)) {
        nextRemovedTests.push(removed);
      }
    } else {
      nextRemovedTests = nextRemovedTests.filter((test) => test.name !== bloodPressureName);
      if (hasBloodPressureTest) {
        nextTests = nextTests.map((test) =>
          test.name === bloodPressureName
            ? {
                name: bloodPressureName,
                why: bloodPressureWhy,
              }
            : test,
        );
      } else {
        nextTests.push({
          name: bloodPressureName,
          why: bloodPressureWhy,
        });
      }
    }
  }

  if (preferences.prostateMethod) {
    const prostateName = "Antígeno prostático específico (APE)";
    const prostateWhy =
      "Lo pedimos a personas de sexo masculino entre 55 y 69 años para tamizaje de cáncer de próstata. Se mantiene en tu orden según tu elección realizada en la parte superior.";
    const hasProstateTest = nextTests.some((test) => test.name === prostateName);

    if (preferences.prostateMethod === "skip") {
      const removed = nextTests.find((test) => test.name === prostateName);
      nextTests = nextTests.filter((test) => test.name !== prostateName);
      if (removed && !nextRemovedTests.some((test) => test.name === removed.name)) {
        nextRemovedTests.push(removed);
      }
    } else {
      nextRemovedTests = nextRemovedTests.filter((test) => test.name !== prostateName);
      if (hasProstateTest) {
        nextTests = nextTests.map((test) =>
          test.name === prostateName
            ? {
                name: prostateName,
                why: prostateWhy,
              }
            : test,
        );
      } else {
        nextTests.push({
          name: prostateName,
          why: prostateWhy,
        });
      }
    }
  }

  if (preferences.addTestName) {
    const normalizedName = preferences.addTestName.trim();
    const optionalTests = new Map([
      [
        "Hemograma",
        "Examen complementario no esencial para tamizaje basado en evidencia, pero de uso clínico frecuente.",
      ],
      [
        "Creatinina en sangre",
        "Examen complementario para revisar función renal basal cuando deseas añadirlo de forma voluntaria.",
      ],
      [
        "Perfil bioquímico",
        "Examen complementario para revisar parámetros metabólicos generales cuando deseas añadirlo de forma voluntaria.",
      ],
      [
        "Niveles de vitamina D",
        "Examen complementario opcional. En Chile el déficit de vitamina D es frecuente y este estudio permite pesquisarlo.",
      ],
    ]);
    const why = optionalTests.get(normalizedName);

    if (why && !nextTests.some((test) => test.name === normalizedName)) {
      nextTests.push({
        name: normalizedName,
        why,
      });
    }

    nextRemovedTests = nextRemovedTests.filter((test) => test.name !== normalizedName);
  }

  if (preferences.removeTestName) {
    const normalizedName = preferences.removeTestName.trim();
    const colorectalNames = new Set([
      "Tamizaje de cáncer colorrectal",
      "Test inmunológico de sangre oculta en deposiciones",
      "Colonoscopía total",
    ]);
    const cervicalNames = new Set([
      "Tamizaje de cáncer cervicouterino",
      "Papanicolau",
      "Papanicolau (PAP)",
      "Test de VPH (HPV)",
      "PCR de virus papiloma humano (VPH)",
      "Cotesting (PAP+VPH)",
    ]);

    const removedNow: typeof nextRemovedTests = [];

    nextTests = nextTests.filter((test) => {
      if (colorectalNames.has(normalizedName) && colorectalNames.has(test.name)) {
        removedNow.push(test);
        return false;
      }

      if (cervicalNames.has(normalizedName) && cervicalNames.has(test.name)) {
        removedNow.push(test);
        return false;
      }

      if (test.name === normalizedName) {
        removedNow.push(test);
        return false;
      }

      return true;
    });

    for (const removed of removedNow) {
      if (!nextRemovedTests.some((test) => test.name === removed.name)) {
        nextRemovedTests.push(removed);
      }
    }
  }

  if (preferences.restoreTestName) {
    const normalizedName = preferences.restoreTestName.trim();
    const restoring = nextRemovedTests.find((test) => test.name === normalizedName);

    if (restoring && !nextTests.some((test) => test.name === restoring.name)) {
      nextTests.push(restoring);
    }

    nextRemovedTests = nextRemovedTests.filter((test) => test.name !== normalizedName);
  }

  const updated = await prisma.chronicControlRequest.update({
    where: { id },
    data: {
      rec: {
        ...record.rec,
        tests: nextTests,
        removedTests: nextRemovedTests,
      },
    },
    include: { payment: true },
  });

  return fromRow(updated);
}

export async function confirmChronicPendingPayment(
  id: string,
  overrides?: Partial<Pick<StoredPayment, "paymentId" | "cardLast4" | "cardholder">>,
) {
  const current = await prisma.chronicControlRequest.findUnique({
    where: { id },
    include: { payment: true },
  });

  if (!current?.payment) {
    return null;
  }

  const pending = current.payment;
  const paidAt = Date.now();
  const confirmed: StoredPayment = {
    amount: pending.amount,
    currency: pending.currency as "CLP",
    paymentId: overrides?.paymentId ?? pending.paymentId,
    cardLast4: overrides?.cardLast4 ?? pending.cardLast4,
    cardholder: overrides?.cardholder ?? pending.cardholder,
    paid: true,
    paidAt,
  };

  const currentStatus = fromRow(current).status;
  const updated = await prisma.chronicControlRequest.update({
    where: { id },
    data: {
      reviewStatus: "queued",
      queuedAt: new Date(paidAt),
      approvedAt: null,
      rejectedAt: null,
      orderId: currentStatus.orderId ?? createOrderId(paidAt),
      payment: {
        update: {
          amount: confirmed.amount,
          currency: confirmed.currency,
          paymentId: confirmed.paymentId,
          cardLast4: confirmed.cardLast4,
          cardholder: confirmed.cardholder,
          status: "paid",
          paidAt: new Date(paidAt),
        },
      },
    },
    include: { payment: true },
  });

  return fromRow(updated);
}

export function serializeChronicControlRecord(record: ChronicControlRecord) {
  return record;
}

export async function listChronicControlsByUser(userId: string) {
  const rows = await prisma.chronicControlRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { payment: true },
  });

  const records = await Promise.all(rows.map((row) => resolveStatus(fromRow(row))));

  return records.map((record) => ({
    id: record.id,
    kind: "control_cronico" as const,
    title: "Control crónico",
    patientName: record.patient.fullName || "Paciente",
    patientEmail: record.patient.email || "",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    status: record.status.status,
    paid: Boolean(record.payment.confirmed?.paid),
    folio: record.status.orderId || record.id.toUpperCase(),
    href: `/control-cronico/orden?id=${record.id}`,
    paymentHref: `/control-cronico/pago?id=${record.id}`,
    reviewHref: `/control-cronico/estado?id=${record.id}`,
  }));
}
