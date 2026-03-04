import FAQ from "@/components/FAQ";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Services from "@/components/Services";
import Trust from "@/components/Trust";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_58%)]" />
        <div className="absolute left-[-10rem] top-40 h-80 w-80 rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="absolute right-[-10rem] top-24 h-96 w-96 rounded-full bg-slate-100 blur-3xl" />
      </div>
      <Header />
      <Hero />
      <HowItWorks />
      <Services />
      <Trust />
      <FAQ />
    </main>
  );
}
