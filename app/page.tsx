import type { Metadata } from "next";
import FAQ from "@/components/FAQ";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import ReviewsMarquee from "@/components/ReviewsMarquee";
import Services from "@/components/Services";
import Trust from "@/components/Trust";
import { createPublicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPublicPageMetadata({
  title: "Veramed | Tu salud digital, más simple",
  description:
    "Chequeos, control de enfermedades, evaluación de síntomas, renovación de recetas y derivaciones médicas online, con validación médica.",
  path: "/",
});

export default function HomePage() {
  return (
    <main className="veramed-page min-h-screen text-slate-900">
      <Hero />
      <Services />
      <ReviewsMarquee />
      <HowItWorks />
      <Trust />
      <FAQ />
    </main>
  );
}
