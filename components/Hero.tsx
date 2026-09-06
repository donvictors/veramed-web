import Image from "next/image";
import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Cuéntanos sobre ti",
    description: "Completa tus datos y antecedentes relevantes en pocos minutos.",
  },
  {
    number: "02",
    title: "Revisa la recomendación",
    description: "Conoce qué exámenes se sugieren y por qué podrían ser útiles.",
  },
  {
    number: "03",
    title: "Recibe tu orden",
    description: "Tras la validación médica, accede a tu orden digital.",
  },
];

export default function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pb-24 md:pt-24">
      <div className="grid items-stretch gap-8 lg:grid-cols-[1.12fr_0.88fr]">
        <div className="flex flex-col justify-center">
          <p className="veramed-kicker">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Medicina preventiva, más simple
          </p>

          <h1 className="veramed-display mt-6 max-w-3xl">
            <span className="block text-5xl sm:text-6xl lg:text-7xl">Tus exámenes,</span>
            <span className="hero-title-reveal mt-2 block text-[clamp(1rem,4.6vw,2rem)] leading-tight tracking-[-0.035em] sm:mt-3">
              con la inteligencIA de la medicina.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Obtén una recomendación personalizada de exámenes preventivos y una orden médica
            digital, a partir de tus antecedentes y la evidencia clínica disponible.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="#servicios" className="veramed-primary-button justify-center px-6 py-3.5">
              Solicitar mi orden <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="#como-funciona"
              className="veramed-secondary-button justify-center px-6 py-3.5"
            >
              Cómo funciona
            </Link>
          </div>

          <div className="mt-8 max-w-2xl border-l-2 border-rose-400 pl-4">
            <p className="text-sm font-semibold text-slate-950">No usar en casos de urgencia</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Si presentas{" "}
              <Link href="#faq-sintomas-alarma" className="font-semibold underline underline-offset-2">
                síntomas de alarma
              </Link>
              , consulta de inmediato con un profesional de salud.
            </p>
          </div>
        </div>

        <div className="relative flex flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(145deg,#ffffff_0%,#f8fafc_68%,#ecfdf5_100%)] p-6 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.45)] sm:p-8">
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Tu recorrido
              </p>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800 shadow-sm ring-1 ring-amber-100/80">
                100% online
              </span>
            </div>
            <h2 className="mt-4 max-w-md text-3xl font-semibold tracking-tight text-slate-950">
              Una orden preparada con contexto.
            </h2>

            <div className="mt-6 space-y-2.5">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="grid grid-cols-[auto_1fr] gap-3 rounded-xl border border-slate-200 bg-white/85 px-3 py-2.5 shadow-[0_12px_35px_-30px_rgba(15,23,42,0.5)] backdrop-blur-sm"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-200">
                    {step.number}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-950">{step.title}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-slate-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <Image
              src="/brand/veramed-landing-image-light.png"
              alt="Persona observando una orden médica de Veramed"
              width={320}
              height={320}
              priority
              sizes="(max-width: 640px) 13rem, 14rem"
              className="mx-auto mt-3 h-auto w-52 object-contain sm:w-56"
            />
          </div>
          <div className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
        </div>
      </div>
    </section>
  );
}
