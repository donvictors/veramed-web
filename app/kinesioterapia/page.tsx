import type { Metadata } from "next";
import { createPublicPageMetadata } from "@/lib/seo";
import KinesiologyPageClient from "./KinesiologyPageClient";

export const metadata: Metadata = createPublicPageMetadata({
  title: "Orden de kinesioterapia online | Veramed",
  description:
    "Solicita una derivación a kinesioterapia a partir de tus antecedentes mediante un proceso digital con revisión médica.",
  path: "/kinesioterapia",
});

export default function KinesiologyPage() {
  return <KinesiologyPageClient />;
}
