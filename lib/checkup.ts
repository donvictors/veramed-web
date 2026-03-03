export type Sex = "M" | "F";
export type Smoking = "never" | "former" | "current";
export type SexualActivity = "yes" | "no";
export type Pregnancy = "yes" | "no" | "unknown";
export type ReviewStatus = "queued" | "approved" | "rejected";

export type CheckupInput = {
  age: number;
  sex: Sex;
  weightKg: number;
  heightCm: number;
  smoking: Smoking;
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
  notes.push("Esto no es diagnóstico. Si tienes síntomas, consulta.");

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

export function createPaymentId(timestamp = Date.now()) {
  const dateCode = new Date(timestamp).toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = String(timestamp).slice(-5);
  return `PAY-${dateCode}-${suffix}`;
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
