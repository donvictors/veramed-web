import FAQ from "@/components/FAQ";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Services from "@/components/Services";
import Trust from "@/components/Trust";

export default function HomePage() {
  return (
    <main className="veramed-page min-h-screen text-slate-900">
      <Hero />
      <Services />
      <HowItWorks />
      <Trust />
      <FAQ />
    </main>
  );
}
