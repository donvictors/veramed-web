import FAQ from "@/components/FAQ";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import ReviewsMarquee from "@/components/ReviewsMarquee";
import Services from "@/components/Services";
import Trust from "@/components/Trust";

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
