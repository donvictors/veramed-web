export type Sex = "M" | "F";
export type Smoking = "never" | "former" | "current";
export type SexualActivity = "yes" | "no";
export type Pregnancy = "yes" | "no";
export type ReviewStatus = "queued" | "approved" | "rejected";

export type PatientNameFields = {
  firstName: string;
  paternalSurname: string;
  maternalSurname: string;
};

export type PatientDetails = {
  fullName: string;
  rut: string;
  birthDate: string;
  email: string;
  phone: string;
  address: string;
};

export type CheckupInput = {
  age: number;
  sex: Sex;
  weightKg: number;
  heightCm: number;
  bodyMassIndex?: number;
  smoking: Smoking;
  cigarettesPerDay?: number;
  smokingYears?: number;
  packYearIndex?: number;
  sexualActivity: SexualActivity;
  pregnancy: Pregnancy;
};

export type TestItem = {
  name: string;
  why: string;
};

export type CheckupRecommendation = {
  summary: string;
  tests: TestItem[];
  notes: string[];
};

export type StoredCheckup = {
  input: CheckupInput;
  patient?: PatientDetails;
  rec: CheckupRecommendation;
};

export type StoredCheckupStatus = {
  status: ReviewStatus;
  queuedAt?: number;
  approvedAt?: number;
  rejectedAt?: number;
  orderId?: string;
};

export type StoredPayment = {
  paid: boolean;
  amount: number;
  currency: "CLP";
  paidAt: number;
  paymentId: string;
  cardLast4: string;
  cardholder: string;
};

export const CHECKUP_PRICE_CLP = 1990;

export function splitPatientFullName(fullName: string): PatientNameFields {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return {
      firstName: "",
      paternalSurname: "",
      maternalSurname: "",
    };
  }

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      paternalSurname: "",
      maternalSurname: "",
    };
  }

  if (parts.length === 2) {
    return {
      firstName: parts[0],
      paternalSurname: parts[1],
      maternalSurname: "",
    };
  }

  return {
    firstName: parts.slice(0, -2).join(" "),
    paternalSurname: parts.at(-2) ?? "",
    maternalSurname: parts.at(-1) ?? "",
  };
}

export function joinPatientFullName(fields: PatientNameFields) {
  return [fields.firstName, fields.paternalSurname, fields.maternalSurname]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
}

export function calculateAgeFromBirthDate(value: string, now = new Date()) {
  if (!value) return 0;

  const birth = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return 0;

  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  const dayDiff = now.getDate() - birth.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return Math.max(0, age);
}

export function calculateBodyMassIndex(weightKg: number, heightCm: number) {
  if (weightKg <= 0 || heightCm <= 0) return 0;

  const heightMeters = heightCm / 100;
  const bmi = weightKg / (heightMeters * heightMeters);
  return Math.round(bmi * 10) / 10;
}

export function calculatePackYearIndex(cigarettesPerDay: number, smokingYears: number) {
  if (cigarettesPerDay <= 0 || smokingYears <= 0) return 0;

  const packIndex = (cigarettesPerDay / 20) * smokingYears;
  return Math.round(packIndex * 10) / 10;
}

export function recommend(input: CheckupInput): CheckupRecommendation {
  if (input.sex === "F" && input.pregnancy === "yes") {
    return {
      summary: "Embarazo declarado: recomendamos control prenatal formal.",
      tests: [
        {
          name: "Control prenatal",
          why: "El panel depende de edad gestacional y antecedentes.",
        },
      ],
      notes: ["Si hay dolor, sangrado o fiebre: consulta urgencia."],
    };
  }

  const tests: TestItem[] = [
    { name: "Hemograma", why: "Pesquisa anemia e infecciones frecuentes." },
    {
      name: "Perfil bioquímico (renal/electrolitos)",
      why: "Línea basal de función renal y electrolitos.",
    },
    { name: "Glicemia en ayunas", why: "Pesquisa alteraciones de glucosa." },
    { name: "Orina completa", why: "Pesquisa infecciones y alteraciones urinarias." },
  ];

  if (input.age >= 40) {
    tests.push({
      name: "Perfil lipídico",
      why: "Estratificación de riesgo cardiovascular.",
    });
    tests.push({
      name: "TSH",
      why: "Pesquisa disfunción tiroidea (más prevalente con la edad).",
    });
  }

  if (input.age >= 60) {
    tests.push({
      name: "HbA1c",
      why: "Pesquisa alteraciones crónicas de glucosa.",
    });
  }

  const notes: string[] = [];
  if (input.smoking !== "never") {
    notes.push("Por tabaco: priorizar prevención CV y consejería de cesación.");
  }
  if (input.sexualActivity === "yes") {
    notes.push("Opcional: panel ITS según preferencia y contexto.");
  }

  const summary =
    input.age < 40
      ? "Chequeo preventivo básico."
      : input.age < 60
        ? "Chequeo cardiometabólico ampliado."
        : "Chequeo ampliado para adulto mayor.";

  return { summary, tests, notes };
}

export function formatSmoking(smoking: Smoking) {
  if (smoking === "never") return "Nunca";
  if (smoking === "former") return "Ex fumador";
  return "Fumador actual";
}

export function formatSex(sex: Sex) {
  return sex === "M" ? "Masculino" : "Femenino";
}

export function formatSexualActivity(value: SexualActivity) {
  return value === "yes" ? "Sí" : "No";
}

export function createOrderId(timestamp = Date.now()) {
  const dateCode = new Date(timestamp).toISOString().slice(2, 10).replaceAll("-", "");
  const suffix = String(timestamp).slice(-4);
  return `VM-${dateCode}-${suffix}`;
}

export function createVerificationCode(rut: string | undefined, timestamp = Date.now()) {
  const rutDigits = (rut ?? "")
    .split("-")[0]
    .replace(/\D/g, "")
    .slice(-4)
    .padStart(4, "0");
  const issuedAt = new Date(timestamp);
  const day = String(issuedAt.getDate()).padStart(2, "0");
  const month = String(issuedAt.getMonth() + 1).padStart(2, "0");
  const hours = String(issuedAt.getHours()).padStart(2, "0");
  const minutes = String(issuedAt.getMinutes()).padStart(2, "0");

  return `VRM${rutDigits}-${day}${month}-${hours}${minutes}`;
}

export function createPaymentId(timestamp = Date.now()) {
  const dateCode = new Date(timestamp).toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = String(timestamp).slice(-5);
  return `PAY-${dateCode}-${suffix}`;
}

export function formatBirthDate(value: string) {
  if (!value) return "No informado";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(parsed);
}

export function inferOrderDetails(tests: TestItem[]) {
  const lowerTests = tests.map((test) => test.name.toLowerCase());
  const needsFasting = lowerTests.some(
    (name) =>
      name.includes("glicemia") || name.includes("perfil lip") || name.includes("hba1c"),
  );
  const includesUrine = lowerTests.some((name) => name.includes("orina"));
  const includesBlood = tests.some((test) => !test.name.toLowerCase().includes("control prenatal"));

  const sampleTypes: string[] = [];
  if (includesBlood) sampleTypes.push("Sangre");
  if (includesUrine) sampleTypes.push("Orina");
  if (sampleTypes.length === 0) sampleTypes.push("Según evaluación clínica");

  const preparation: string[] = [];
  if (needsFasting) {
    preparation.push("Ayuno de 8 a 12 horas antes de la toma de muestra sanguínea.");
  } else {
    preparation.push("No requiere ayuno estricto salvo instrucción específica del laboratorio.");
  }
  if (includesUrine) {
    preparation.push(
      "Para orina completa, idealmente usar la primera muestra de la mañana o retener al menos 3 horas.",
    );
  }
  preparation.push("Mantén hidratación habitual y evita ejercicio intenso el día previo.");

  return {
    includedCount: tests.length,
    needsFasting,
    sampleTypeLabel: sampleTypes.join(" / "),
    preparation,
  };
}
