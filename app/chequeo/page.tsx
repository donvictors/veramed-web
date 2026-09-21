import type { Metadata } from "next";
import { createPublicPageMetadata } from "@/lib/seo";
import CheckupPageClient from "./CheckupPageClient";

export const metadata: Metadata = createPublicPageMetadata({
  title: "Chequeo preventivo online | Veramed",
  description:
    "Solicita una orden de exámenes preventivos según tu perfil mediante un proceso digital simple y con validación médica.",
  path: "/chequeo",
});

export default function CheckupPage() {
  return <CheckupPageClient />;
}
