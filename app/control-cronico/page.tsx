import type { Metadata } from "next";
import { createPublicPageMetadata } from "@/lib/seo";
import ChronicControlPageClient from "./ChronicControlPageClient";

export const metadata: Metadata = createPublicPageMetadata({
  title: "Control de enfermedades crónicas online | Veramed",
  description:
    "Solicita exámenes para el control de tus enfermedades y medicamentos mediante un proceso digital con criterios clínicos y validación médica.",
  path: "/control-cronico",
});

export default function ChronicControlPage() {
  return <ChronicControlPageClient />;
}
