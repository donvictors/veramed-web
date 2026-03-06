export type OrderCategory = "laboratory" | "image" | "procedure" | "interconsultation";

const IMAGE_TESTS = new Set([
  "Ecografía abdominal",
  "Mamografía bilateral",
  "Ecografía mamaria",
  "TC de tórax de baja dosis",
  "Densitometría ósea",
]);

const PROCEDURE_TESTS = new Set([
  "Holter de presión arterial (MAPA)",
  "Tamizaje de cáncer cervicouterino",
  "Papanicolau (PAP)",
  "Cotesting (PAP+VPH)",
  "Tamizaje de cáncer colorrectal",
  "Colonoscopía total",
  "Electrocardiograma (ECG)",
  "Espirometría basal y post broncodilatador",
  "Estudio de capacidad de difusion (DLCO)",
  "Test de caminata en 6 minutos",
]);

const INTERCONSULTATION_TESTS = new Set(["Fondo de ojo"]);

export function getOrderCategoryByTestName(testName: string): OrderCategory {
  if (INTERCONSULTATION_TESTS.has(testName)) return "interconsultation";
  if (IMAGE_TESTS.has(testName)) return "image";
  if (PROCEDURE_TESTS.has(testName)) return "procedure";
  return "laboratory";
}

export function parseOrderCategory(value: string | null): OrderCategory | null {
  if (
    value === "laboratory" ||
    value === "image" ||
    value === "procedure" ||
    value === "interconsultation"
  ) {
    return value;
  }
  return null;
}

export function getOrderCategoryMeta(category: OrderCategory) {
  if (category === "image") {
    return {
      shortLabel: "Imágenes",
      badge: "Orden médica de imágenes",
      screenTitle: "Orden de imágenes",
      printTitle: "ORDEN DE IMÁGENES",
      tableLabel: "Imagen / examen",
      emailLabel: "Orden de imágenes ☢️",
    };
  }

  if (category === "procedure") {
    return {
      shortLabel: "Procedimientos",
      badge: "Orden médica de procedimientos",
      screenTitle: "Orden de procedimientos",
      printTitle: "ORDEN DE PROCEDIMIENTOS",
      tableLabel: "Procedimiento",
      emailLabel: "Orden de procedimientos 🏥",
    };
  }

  if (category === "interconsultation") {
    return {
      shortLabel: "Interconsulta",
      badge: "Orden de derivación",
      screenTitle: "Orden de derivación",
      printTitle: "ORDEN DE DERIVACIÓN",
      tableLabel: "Interconsulta",
      emailLabel: "Orden de derivación 👁️",
    };
  }

  return {
    shortLabel: "Laboratorio",
    badge: "Orden médica de laboratorio",
    screenTitle: "Orden de laboratorio",
    printTitle: "ORDEN DE LABORATORIO",
    tableLabel: "Examen",
    emailLabel: "Orden de laboratorio 💉",
  };
}

