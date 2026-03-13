import { getExamCategoryByName } from "@/lib/exam-master-catalog";

export type OrderCategory = "laboratory" | "image" | "procedure" | "interconsultation";

export function getOrderCategoryByTestName(testName: string): OrderCategory {
  return getExamCategoryByName(testName);
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
