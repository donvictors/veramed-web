import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createPublicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPublicPageMetadata({
  title: "Nosotros | Veramed",
  description:
    "Conoce cómo Veramed simplifica necesidades concretas de salud mediante tecnología, criterios clínicos definidos y respaldo profesional.",
  path: "/nosotros",
});

const carePillars = [
  {
    title: "Acceso sin vueltas innecesarias",
    paragraphs: [
      "Creamos procesos pensados para situaciones que pueden resolverse de manera digital, evitando pasos que no aportan valor.",
    ],
    icon: "access",
  },
  {
    title: "Criterio médico",
    paragraphs: [
      "Cada servicio está diseñado sobre criterios clínicos definidos y considera la información necesaria para decidir qué corresponde en cada caso.",
    ],
    icon: "clinical",
  },
  {
    title: "Tecnología con propósito",
    paragraphs: [
      "Utilizamos herramientas digitales e inteligencia artificial para organizar información, hacer los procesos más eficientes y reducir tareas innecesarias.",
      "La decisión clínica sigue siendo humana cuando corresponde.",
    ],
    icon: "technology",
  },
] as const;

const principles = [
  {
    number: "01",
    title: "Criterio médico primero",
    paragraphs: [
      "La tecnología puede ayudar a recopilar, organizar y analizar información, pero no reemplaza el juicio clínico.",
      "Por eso nuestros servicios se diseñan alrededor de criterios médicos claros y procesos de revisión definidos.",
    ],
    icon: "clinical",
  },
  {
    number: "02",
    title: "Lo necesario, no simplemente más",
    paragraphs: [
      "Más exámenes, tratamientos o intervenciones no significan necesariamente una mejor atención.",
      "Buscamos entregar lo que tenga sentido para cada situación, evitando complejidad innecesaria.",
    ],
    icon: "evidence",
  },
  {
    number: "03",
    title: "Claridad",
    paragraphs: [
      "La salud ya puede ser suficientemente compleja.",
      "Nuestros procesos, recomendaciones y documentos están diseñados para que entiendas qué estás solicitando, qué recibirás y qué pasos seguir después.",
    ],
    icon: "clarity",
  },
] as const;

const clinicalSteps = [
  {
    step: "01",
    title: "Conocemos tu contexto",
    paragraphs: [
      "Cada servicio comienza recopilando únicamente la información necesaria para entender qué necesitas.",
      "Las preguntas cambian según el tipo de atención y tus respuestas.",
    ],
  },
  {
    step: "02",
    title: "Aplicamos criterios clínicos",
    paragraphs: [
      "La información se procesa utilizando reglas, protocolos y herramientas diseñadas específicamente para cada servicio.",
      "Esto permite orientar cada solicitud de forma consistente y eficiente.",
    ],
  },
  {
    step: "03",
    title: "Revisión médica cuando corresponde",
    paragraphs: [
      "Las prestaciones que requieren indicación médica son revisadas y validadas por un médico antes de su emisión.",
      "Si la situación requiere una evaluación diferente o una consulta presencial, también podemos indicarlo.",
    ],
  },
] as const;

export default function AboutPage() {
  return (
    <main className="overflow-hidden bg-white text-slate-900">
      <section className="relative isolate border-b border-slate-200/80">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_52%,#ecfdf5_100%)]" />
          <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-sky-100/70 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] [background-size:48px_48px]" />
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:py-24 lg:grid-cols-[1.08fr_0.92fr] lg:py-28">
          <div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.03] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
              Hacemos que cuidar tu salud sea <span className="text-emerald-700">más simple</span>
            </h1>
            <div className="mt-7 max-w-2xl space-y-5 text-lg leading-8 text-slate-600 md:text-xl md:leading-9">
              <p>
                Hay necesidades de salud que requieren criterio médico, pero no necesariamente una
                consulta tradicional.
              </p>
              <p>
                En Veramed usamos tecnología para simplificar esos procesos, recopilar la
                información necesaria y entregar soluciones de salud claras, accesibles y con
                respaldo profesional.
              </p>
            </div>
            <p className="mt-8 border-l-2 border-emerald-500 pl-5 text-lg font-semibold text-slate-950">
              Menos fricción. Más claridad para cuidar tu salud.
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-[32rem] lg:mx-0 lg:ml-auto">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-white/50 blur-xl" />
            <div className="relative overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white p-3 shadow-[0_35px_90px_-40px_rgba(15,23,42,0.35)]">
              <div className="relative aspect-square overflow-hidden rounded-[1.75rem] bg-slate-900">
                <Image
                  src="/brand/veramed-landing-image.png"
                  alt="Persona utilizando los servicios digitales de salud de Veramed"
                  fill
                  priority
                  sizes="(max-width: 1024px) 90vw, 42vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Nuestro origen
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-slate-950 md:text-5xl">
              ¿Por qué existe Veramed?
            </h2>
          </div>
          <div className="space-y-6 text-lg leading-8 text-slate-600">
            <p>
              En la práctica médica veíamos una situación repetirse: muchas necesidades de salud
              relativamente simples terminaban obligando a las personas a pasar por procesos
              largos, caros o innecesariamente complejos.
            </p>
            <p>
              Agendar una consulta, esperar disponibilidad, trasladarse y pagar una atención
              completa muchas veces era el único camino para obtener algo concreto: una orden de
              exámenes, renovar una receta, solicitar una derivación o resolver una necesidad
              específica de salud.
            </p>
            <p className="border-l-2 border-emerald-500 pl-6 font-semibold text-slate-950">
              Veramed nació para hacer esas situaciones más simples.
            </p>
            <p>
              Diseñamos procesos digitales que recopilan el contexto necesario, aplican criterios
              clínicos definidos y utilizan tecnología para hacer más eficiente cada atención.
            </p>
            <p>
              Cuando una prestación requiere indicación médica, un médico revisa la información
              antes de su emisión.
            </p>
            <p className="font-medium text-slate-950">
              La tecnología está al servicio del criterio médico, no en reemplazo de él.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Nuestra propuesta
          </p>
          <h2 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.03em] text-slate-950 md:text-5xl">
            Una forma más simple de resolver necesidades concretas de salud
          </h2>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {carePillars.map((pillar) => (
              <article
                key={pillar.title}
                className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.45)] md:p-8"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <PillarIcon name={pillar.icon} />
                </span>
                <h3 className="mt-7 text-xl font-semibold text-slate-950">{pillar.title}</h3>
                {pillar.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-3 text-sm leading-7 text-slate-600">
                    {paragraph}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Lo que nos guía
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-slate-950 md:text-5xl">
          Nuestros principios
        </h2>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {principles.map((principle) => (
            <article
              key={principle.number}
              className="group rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.45)] transition hover:-translate-y-1 hover:border-emerald-200"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white transition group-hover:bg-emerald-700">
                  <PrincipleIcon name={principle.icon} />
                </span>
                <span className="text-xs font-semibold tracking-[0.18em] text-slate-400">
                  {principle.number}
                </span>
              </div>
              <h3 className="mt-8 text-xl font-semibold text-slate-950">{principle.title}</h3>
              {principle.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-sm leading-7 text-slate-600">
                  {paragraph}
                </p>
              ))}
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-[linear-gradient(135deg,#ecfdf5,#ffffff_70%)]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:py-28 lg:grid-cols-[0.88fr_1.12fr] lg:gap-20">
          <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[2.25rem] bg-white/70 p-5 shadow-[0_28px_80px_-44px_rgba(15,23,42,0.42)] ring-1 ring-slate-200">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-slate-900">
              <Image
                src="/brand/voxel-doc.png"
                alt="Representación del equipo médico de Veramed"
                fill
                sizes="(max-width: 1024px) 90vw, 38vw"
                className="object-cover"
              />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Quiénes somos
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-slate-950 md:text-5xl">
              El equipo detrás de Veramed
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Veramed es un proyecto chileno de salud digital desarrollado desde la práctica
              clínica.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Nuestro proceso
              </p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
                Cómo funciona Veramed
              </h2>
            </div>
            <ol className="divide-y divide-white/10 border-y border-white/10">
              {clinicalSteps.map((item) => (
                <li key={item.step} className="grid gap-4 py-7 sm:grid-cols-[3rem_1fr]">
                  <span className="text-sm font-semibold text-emerald-300">{item.step}</span>
                  <div>
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                    {item.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="mt-3 text-sm leading-7 text-slate-300">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
          <h2 className="text-4xl font-semibold tracking-[-0.03em] text-slate-950 md:text-5xl">
            ¿Qué puedes resolver en Veramed?
          </h2>
          <div className="space-y-6 text-lg leading-8 text-slate-600">
            <p>
              Desde chequeos preventivos y control de enfermedades hasta evaluación de síntomas,
              renovación de recetas y otras necesidades específicas de salud.
            </p>
            <p>Cada servicio está diseñado con la misma idea:</p>
            <p className="border-l-2 border-emerald-500 pl-6 font-semibold text-slate-950">
              resolver de manera simple aquello que no siempre necesita una consulta tradicional.
            </p>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-t border-emerald-200 bg-emerald-50">
        <div className="pointer-events-none absolute -right-20 -top-24 -z-10 h-80 w-80 rounded-full border-[55px] border-emerald-100" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 -z-10 h-96 w-96 rounded-full bg-white/70 blur-2xl" />
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="rounded-[2.25rem] border border-emerald-200 bg-white/80 px-7 py-10 text-center shadow-[0_30px_80px_-55px_rgba(5,150,105,0.5)] backdrop-blur md:px-16 md:py-16">
            <h2 className="mx-auto max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-slate-950 md:text-5xl">
              Tu salud, con menos vueltas
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">
              Explora nuestros servicios y elige el que mejor se adapte a lo que necesitas.
            </p>
            <Link
              href="/#servicios"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
            >
              Ver servicios
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function PillarIcon({ name }: { name: "access" | "clinical" | "technology" }) {
  if (name === "access") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "technology") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="5" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9 9h6v6H9zM9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return <PrincipleIcon name="clinical" />;
}

function PrincipleIcon({ name }: { name: "clinical" | "evidence" | "clarity" }) {
  if (name === "clinical") {
    return (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3 5 6v5c0 4.8 3 8 7 10 4-2 7-5.2 7-10V6l-7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "evidence") {
    return (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 3h8v3H8V3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M7 5H5.8A1.8 1.8 0 0 0 4 6.8v12.4A1.8 1.8 0 0 0 5.8 21h12.4a1.8 1.8 0 0 0 1.8-1.8V6.8A1.8 1.8 0 0 0 18.2 5H17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="m8 14 2.2 2L16 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 5h14M5 12h9M5 19h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="18" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10h12m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
