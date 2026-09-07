import ExamOrderBuilder from "@/app/portal-medicos/_components/ExamOrderBuilder";
import { EXAM_MASTER_CATALOG } from "@/lib/exam-master-catalog";

export default function MedicalExamOrdersPage() {
  const catalog = EXAM_MASTER_CATALOG.filter((exam) => exam.category !== "interconsultation").map((exam) => ({
    name: exam.name,
    category: exam.category as "laboratory" | "image" | "procedure",
    fonasaCode: exam.fonasaCode,
    aliases: [...(exam.aliases ?? [])],
    orderObservation: exam.orderObservation ?? "",
  }));
  return <ExamOrderBuilder catalog={catalog} />;
}
