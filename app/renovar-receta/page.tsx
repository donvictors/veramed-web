import type { Metadata } from "next";
import { createPublicPageMetadata } from "@/lib/seo";
import PrescriptionRenewalPageClient from "./PrescriptionRenewalPageClient";

export const metadata: Metadata = createPublicPageMetadata({
  title: "Renovación de recetas online | Veramed",
  description:
    "Solicita la renovación de recetas para tratamientos habituales elegibles mediante un proceso digital con validación médica.",
  path: "/renovar-receta",
});

export default function PrescriptionRenewalPage() {
  return <PrescriptionRenewalPageClient />;
}
