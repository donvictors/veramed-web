import Image from "next/image";
import Link from "next/link";

const services = [
  {
    icon: "🩺",
    title: "Hacerme un chequeo",
    description: "Exámenes preventivos según mi perfil.",
  },
  {
    icon: "💊",
    title: "Controlar una enfermedad",
    description: "Exámenes para mis condiciones y medicamentos.",
  },
  {
    icon: "✨",
    title: "Evaluar síntomas",
    description: "No sé qué examen necesito.",
  },
  {
    icon: "📄",
    title: "Órdenes, derivaciones y tratamiento",
    description: "Renovación de receta, derivación a kine y control de peso.",
  },
];

export default function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pb-24 md:pt-24">
      <div className="grid items-stretch gap-8 lg:grid-cols-[1.12fr_0.88fr]">
        <div className="flex flex-col justify-center">
          <p className="veramed-kicker">
            Salud simple, sin salir de tu casa
          </p>

          <h1 className="veramed-display mt-6 max-w-3xl">
            <span className="block text-[clamp(2.25rem,11vw,4.5rem)]">Tu salud,</span>
            <span className="hero-title-reveal mt-2 text-[clamp(2.25rem,11vw,4.5rem)] sm:mt-3">
              ahora más simple.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Obtén órdenes de exámenes, controla tus enfermedades, renueva tratamientos o solicita
            derivaciones médicas de forma simple.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="#servicios" className="veramed-primary-button justify-center px-6 py-3.5">
              Ver servicios <span aria-hidden="true">→</span>
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
                Nuestros servicios
              </p>
            </div>
            <h2 className="mt-4 max-w-md text-3xl font-semibold tracking-tight text-slate-950">
              ¿Qué necesitas hoy?
            </h2>

            <div className="mt-6 space-y-2.5">
              {services.map((service) => (
                <div
                  key={service.title}
                  className="grid grid-cols-[auto_1fr] gap-3 rounded-xl border border-slate-200 bg-white/85 px-3 py-2.5 shadow-[0_12px_35px_-30px_rgba(15,23,42,0.5)] backdrop-blur-sm"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center text-lg" aria-hidden="true">
                    {service.icon}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-950">{service.title}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-slate-600">{service.description}</p>
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
