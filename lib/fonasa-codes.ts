import { getExamFonasaCodeByName } from "@/lib/exam-master-catalog";

export function getFonasaCodeByExamName(examName: string) {
  return getExamFonasaCodeByName(examName);
}

