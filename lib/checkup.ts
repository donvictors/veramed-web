export type Sex = "M" | "F";
export type Smoking = "never" | "former" | "current";
export type SexualActivity = "yes" | "no";
export type Pregnancy = "yes" | "no";
export type DietaryRestriction = "none" | "special";
export type DietaryPattern = "vegan" | "vegetarian" | "ketogenic" | "gluten_free";
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
  quitSmokingYearsAgo?: number;
  sexualActivity: SexualActivity;
  pregnancy: Pregnancy;
  gestationWeeks?: number;
  dietaryRestriction?: DietaryRestriction;
  dietaryPatterns?: DietaryPattern[];
};

export type TestItem = {
  name: string;
  why: string;
};

export type TestSampleType =
  | "Sangre"
  | "Orina"
  | "Hisopado endocervical"
  | "Orina 2da micción muestra aislada"
  | "Secreción endocervical / orina de primer chorro / secreción vaginal";

export type CheckupRecommendation = {
  summary: string;
  tests: TestItem[];
  notes: string[];
  removedTests?: TestItem[];
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

const TEST_SAMPLE_TYPE_MAP: Record<string, string> = {
  "Orina completa": "Orina",
  Urocultivo: "Orina",
  "PCR de virus papiloma humano (VPH)": "Hisopado endocervical",
  "PCR Chlamydia trachomatis y Neisseria gonorrhoeae":
    "Secreción endocervical / orina de primer chorro / secreción vaginal",
  "Razón albuminuria / creatininuria (RAC) en orina aislada":
    "Orina 2da micción muestra aislada",
};

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

export function normalizeRut(raw: string) {
  const cleaned = raw.toUpperCase().replace(/[^0-9K]/g, "");
  if (!cleaned) return "";

  if (cleaned.length === 1) {
    return cleaned;
  }

  const body = cleaned.slice(0, -1).replace(/K/g, "");
  const dv = cleaned.slice(-1);
  return `${body}${dv}`;
}

export function formatRut(rawOrNormalized: string) {
  const normalized = normalizeRut(rawOrNormalized);
  if (!normalized) return "";

  if (normalized.length === 1) {
    return normalized;
  }

  const body = normalized.slice(0, -1);
  const dv = normalized.slice(-1);
  const withThousands = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withThousands}-${dv}`;
}

export function isValidRut(rawOrNormalized: string) {
  const normalized = normalizeRut(rawOrNormalized);
  if (normalized.length < 8 || normalized.length > 9) {
    return false;
  }

  const body = normalized.slice(0, -1);
  const dv = normalized.slice(-1);
  if (!/^\d{7,8}$/.test(body) || !/^[0-9K]$/.test(dv)) {
    return false;
  }

  let multiplier = 2;
  let sum = 0;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  const expectedDv = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  return dv === expectedDv;
}

export function recommend(input: CheckupInput): CheckupRecommendation {
  const testMap = new Map<string, TestItem>();

  function addTest(name: string, reason: string) {
    const current = testMap.get(name);
    if (!current) {
      testMap.set(name, { name, why: reason });
      return;
    }

    if (!current.why.includes(reason)) {
      current.why = `${current.why} ${reason}`;
    }
  }

  const isPregnant = input.sex === "F" && input.pregnancy === "yes";
  const isSexuallyActive = input.sexualActivity === "yes";
  const isFemale = input.sex === "F";
  const isMale = input.sex === "M";
  const bmi = input.bodyMassIndex ?? 0;
  const gestationWeeks = input.gestationWeeks ?? 0;
  const packYearIndex = input.packYearIndex ?? 0;
  const quitSmokingYearsAgo = input.quitSmokingYearsAgo ?? 0;
  const eligibleFormerSmoker = input.smoking === "former" && quitSmokingYearsAgo <= 15;
  const eligibleCurrentSmoker = input.smoking === "current";
  const dietaryPatterns = new Set(input.dietaryPatterns ?? []);

  addTest(
    "Glucosa en sangre",
    "Lo pedimos como examen de tamizaje basal para todas las personas.",
  );
  addTest(
    "Perfil lipídico",
    "Lo pedimos como examen de tamizaje basal para todas las personas.",
  );

  if (input.age >= 15 && input.age <= 65) {
    addTest(
      "ELISA para VIH",
      "Lo recomendamos como tamizaje universal entre los 15 y 65 años, y además en personas de cualquier edad que sean sexualmente activas.",
    );
  }

  if (isPregnant) {
    addTest(
      "ELISA para VIH",
      "El embarazo requiere tamizaje universal para VIH, independiente de la edad.",
    );
    addTest(
      "Antígeno de superficie Virus Hepatitis B (HBsAg)",
      "El embarazo requiere tamizaje para hepatitis B.",
    );
    addTest(
      "Orina completa",
      "En embarazo se incluye control urinario preventivo.",
    );
    addTest(
      "Urocultivo",
      "En embarazo se incluye pesquisa de bacteriuria asintomática.",
    );
  }

  if (input.age > 18) {
    addTest(
      "Holter de presión arterial (MAPA)",
      "El tamizaje de hipertensión arterial lo recomendamos de forma preventiva en todas las personas mayores de 18 años. En la siguiente página puedes ver métodos de tamizaje distintos al Holter de presión (¡no es el único!).",
    );
  }

  if (isFemale && input.age >= 21 && input.age <= 65) {
    addTest(
      "Tamizaje de cáncer cervicouterino",
      "En el siguiente paso puedes elegir la opción de método de tamizaje.",
    );
  }

  if (input.age >= 45 && input.age <= 75) {
    addTest(
      "Tamizaje de cáncer colorrectal",
      "Se lo indicamos a todas las personas de 45 años o más. En el siguiente paso puedes elegir la opción de método de tamizaje.",
    );
  }

  if (isSexuallyActive) {
    addTest(
      "ELISA para VIH",
      "Lo recomendamos como tamizaje universal entre los 15 y 65 años, y además en personas de cualquier edad que sean sexualmente activas.",
    );
    addTest(
      "RPR/VDRL",
      "Lo recomendamos en todas las personas sexualmente activas.",
    );
    addTest(
      "Antígeno de superficie Virus Hepatitis B (HBsAg)",
      "Lo recomendamos en todas las personas sexualmente activas.",
    );
    addTest(
      "Anticuerpos anti Virus Hepatitis C",
      "Lo recomendamos en todas las personas sexualmente activas.",
    );
  }

  if ((isFemale && isSexuallyActive) || isPregnant) {
    addTest(
      "PCR Chlamydia trachomatis y Neisseria gonorrhoeae",
      "Corresponde tamizaje de ITS según sexo y contexto clínico declarado.",
    );
  }

  if (isPregnant && gestationWeeks >= 24) {
    addTest(
      "Prueba de tolerancia a la glucosa oral (PTGO)",
      "Desde las 24 semanas se agrega tamizaje de diabetes gestacional.",
    );
  }

  if (input.age >= 65 && input.age <= 75 && input.smoking !== "never") {
    addTest(
      "Ecografía abdominal",
      "La pedimos a personas de entre 65 y 75 años que hayan fumado, para la detección precoz de aneurismas de aorta abdominal (AAA).",
    );
  }

  if (isFemale && input.age >= 40 && input.age <= 74) {
    addTest(
      "Mamografía bilateral",
      "Indicamos tamizaje de cáncer de mama a personas de sexo femenino entre 40 y 74 años. Por defecto se incluye mamografía bilateral y en el siguiente paso puedes optar por agregar una ecografía mamaria.",
    );
  }

  if (
    input.age >= 50 &&
    input.age <= 80 &&
    packYearIndex >= 20 &&
    (eligibleCurrentSmoker || eligibleFormerSmoker)
  ) {
    addTest(
      "TC de tórax de baja dosis",
      "Es un scanner de tórax realizado con baja dosis de radiación. Lo pedimos según tu edad y carga tabáquica acumulada para la detección temprana del cáncer de pulmón.",
    );
  }

  if (isFemale && input.age > 65) {
    addTest(
      "Densitometría ósea",
      "Se agrega por tamizaje de salud ósea en mujer mayor de 65 años.",
    );
  }

  if (input.age >= 35 && bmi >= 25) {
    addTest(
      "Hemoglobina glicosilada (HbA1C)",
      "Además de la glucosa que la pedimos universalmente, solicitamos HbA1C a personas de más de 35 años que tengan sobrepeso según IMC.",
    );
  }

  if (isMale && input.age >= 55 && input.age <= 69) {
    addTest(
      "Antígeno prostático específico (APE)",
      "Lo pedimos a personas de sexo masculino entre 55 y 69 años para tamizaje de cáncer de próstata. En el siguiente paso podrás leer sobre los beneficios y riesgos del tamizaje con APE y las opiniones de las prinicipales sociedades médicas.",
    );
  }

  if (dietaryPatterns.has("vegan") || dietaryPatterns.has("vegetarian")) {
    addTest(
      "Niveles de vitamina B12",
      "Se agrega por dieta vegana/vegetaria para evaluar riesgo de déficit de vitamina B12.",
    );
    addTest(
      "Ferritina",
      "Se agrega por dieta vegana/vegetaria para control de reservas de hierro.",
    );
    addTest(
      "Cinética de fierro",
      "Se agrega por dieta vegana/vegetaria para evaluar estado de hierro circulante.",
    );
    addTest(
      "Hemograma",
      "Se agrega por dieta vegana/vegetaria para evaluar parámetros hematológicos asociados.",
    );
    addTest(
      "Niveles de vitamina D",
      "Se agrega por dieta vegana/vegetaria para evaluar estado de vitamina D.",
    );
  }

  if (dietaryPatterns.has("ketogenic")) {
    addTest(
      "Ácido úrico",
      "Se agrega por dieta cetogénica para control metabólico complementario.",
    );
  }

  if (dietaryPatterns.has("gluten_free")) {
    addTest(
      "Ferritina",
      "Se agrega por dieta libre de gluten para control de reservas de hierro.",
    );
    addTest(
      "Cinética de fierro",
      "Se agrega por dieta libre de gluten para evaluar estado de hierro circulante.",
    );
    addTest(
      "Hemograma",
      "Se agrega por dieta libre de gluten para evaluación hematológica complementaria.",
    );
    addTest(
      "Folato sérico",
      "Se agrega por dieta libre de gluten para evaluar estado de folato.",
    );
  }

  const tests = Array.from(testMap.values());
  const summary =
    tests.length > 0
      ? `Se identificaron ${tests.length} exámenes preventivos según tus datos clínicos.`
      : "No se identificaron exámenes preventivos con la información ingresada.";

  return {
    summary,
    tests,
    notes: [],
    removedTests: [],
  };
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

export function getTestSampleType(testName: string) {
  return TEST_SAMPLE_TYPE_MAP[testName] ?? "Sangre";
}

export function formatBirthDate(value: string) {
  if (!value) return "No informado";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(parsed);
}

export function inferOrderDetails(tests: TestItem[]) {
  const sampleTypeSet = new Set(tests.map((test) => getTestSampleType(test.name)));
  const includesUrine =
    sampleTypeSet.has("Orina") || sampleTypeSet.has("Orina 2da micción muestra aislada");
  const lowerTests = tests.map((test) => test.name.toLowerCase());
  const needsFasting = lowerTests.some(
    (name) =>
      name.includes("glicemia") ||
      name.includes("glucosa") ||
      name.includes("perfil lip") ||
      name.includes("hba1c") ||
      name.includes("ptgo"),
  );
  const sampleTypes: string[] = [];
  if (sampleTypeSet.has("Sangre")) sampleTypes.push("Sangre");
  if (sampleTypeSet.has("Orina")) sampleTypes.push("Orina");
  if (sampleTypeSet.has("Hisopado endocervical")) sampleTypes.push("Hisopado endocervical");
  if (
    sampleTypeSet.has("Secreción endocervical / orina de primer chorro / secreción vaginal")
  ) {
    sampleTypes.push("Secreción endocervical / orina de primer chorro / secreción vaginal");
  }
  if (sampleTypeSet.has("Orina 2da micción muestra aislada")) {
    sampleTypes.push("Orina 2da micción muestra aislada");
  }
  if (sampleTypes.length === 0) sampleTypes.push("Según evaluación clínica");
  const sampleTypeLabel = sampleTypes
    .map((sampleType) => sampleType.charAt(0).toLowerCase() + sampleType.slice(1))
    .join(", ");

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
    sampleTypeLabel,
    preparation,
  };
}
