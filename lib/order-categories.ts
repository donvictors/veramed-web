import { getExamCategoryByName } from "@/lib/exam-master-catalog";

export type OrderCategory = "laboratory" | "image" | "procedure" | "interconsultation";

export function getOrderCategoryByTestName(testName: string): OrderCategory {
  return getExamCategoryByName(testName);
}

export type CheckupSelectionCounts = {
  laboratory: number;
  image: number;
  procedure: number;
};

export function countCheckupSelection(tests: Array<{ name: string }>): CheckupSelectionCounts {
  return tests.reduce<CheckupSelectionCounts>(
    (counts, test) => {
      const category = getOrderCategoryByTestName(test.name);
      if (category === "image") counts.image += 1;
      else if (category === "procedure") counts.procedure += 1;
      else counts.laboratory += 1;
      return counts;
    },
    { laboratory: 0, image: 0, procedure: 0 },
  );
}

export function formatCheckupSelectionSummary(counts: CheckupSelectionCounts) {
  const categories = [
    counts.laboratory > 0
      ? `${counts.laboratory} ${counts.laboratory === 1 ? "examen" : "exámenes"} de laboratorio`
      : null,
    counts.image > 0
      ? `${counts.image} ${counts.image === 1 ? "examen" : "exámenes"} de imagen`
      : null,
    counts.procedure > 0
      ? `${counts.procedure} ${counts.procedure === 1 ? "procedimiento" : "procedimientos"}`
      : null,
  ].filter((category): category is string => Boolean(category));

  return categories.join(" · ") || "Sin exámenes seleccionados";
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
