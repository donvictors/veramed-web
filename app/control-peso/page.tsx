import type { Metadata } from "next";
import { createPublicPageMetadata } from "@/lib/seo";
import WeightManagementPageClient from "./WeightManagementPageClient";

export const metadata: Metadata = createPublicPageMetadata({
  title: "Evaluación para control de peso online | Veramed",
  description:
    "Evalúa si podrías ser candidato a un tratamiento médico para el control de peso mediante una encuesta digital y revisión médica.",
  path: "/control-peso",
});

export default function WeightManagementPage() {
  return <WeightManagementPageClient />;
}
