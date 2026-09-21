import type { Metadata } from "next";
import { createPublicPageMetadata } from "@/lib/seo";
import SymptomsPageClient from "./SymptomsPageClient";

export const metadata: Metadata = createPublicPageMetadata({
  title: "Evaluación de síntomas online | Veramed",
  description:
    "Cuéntanos tus síntomas para orientar qué evaluación o exámenes podrían corresponder mediante un proceso digital con revisión médica.",
  path: "/sintomas",
});

export default function SymptomsPage() {
  return <SymptomsPageClient />;
}
