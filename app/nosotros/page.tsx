import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Nosotros | Veramed",
  description:
    "Conoce el propósito de Veramed: hacer más simple el acceso a exámenes de salud con criterio médico, evidencia clínica y tecnología.",
};

const principles = [
  {
    number: "01",
    title: "Criterio médico",
    description:
      "La tecnología ordena el proceso, pero las decisiones clínicas se sostienen en protocolos y validación médica.",
    icon: "clinical",
  },
  {
    number: "02",
    title: "Evidencia antes que exceso",
    description:
      "Buscamos facilitar los exámenes que pueden aportar valor y evitar estudios innecesarios.",
    icon: "evidence",
  },
  {
    number: "03",
    title: "Claridad en cada paso",
    description:
      "Traducimos un proceso complejo en una experiencia comprensible, trazable y centrada en las personas.",
    icon: "clarity",
  },
] as const;

const clinicalSteps = [
  {
    step: "01",
    title: "Conocemos tu contexto",
    description: "Recopilamos los antecedentes necesarios para orientar la solicitud.",
  },
  {
    step: "02",
    title: "Aplicamos criterio clínico",
    description: "La recomendación se estructura con protocolos basados en evidencia.",
  },
  {
    step: "03",
    title: "Validamos antes de emitir",
    description: "Un médico revisa y aprueba la orden antes de que llegue a tus manos.",
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
              Hacemos que cuidar tu salud sea{" "}
              <span className="text-emerald-700">más claro.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl md:leading-9">
              Veramed nació para simplificar el acceso a exámenes de salud con una experiencia
              digital cercana, recomendaciones basadas en evidencia y validación médica.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/#servicios"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(15,23,42,0.8)] transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Conoce nuestros servicios
                <ArrowIcon />
              </Link>
              <Link
                href="/contacto"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white/80 px-6 py-3.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white"
              >
                Hablemos
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[32rem] lg:mx-0 lg:ml-auto">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-white/50 blur-xl" />
            <div className="relative overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white p-3 shadow-[0_35px_90px_-40px_rgba(15,23,42,0.35)]">
              <div className="relative aspect-square overflow-hidden rounded-[1.75rem] bg-slate-900">
                <Image
                  src="/brand/veramed-landing-image.png"
                  alt="Paciente revisando una orden médica de Veramed"
                  fill
                  priority
                  sizes="(max-width: 1024px) 90vw, 42vw"
                  className="object-cover"
                />
                <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-slate-200/80 bg-white/95 px-5 py-5 text-slate-950 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] backdrop-blur-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Nuestro propósito
                  </p>
                  <p className="mt-2 max-w-sm text-lg font-semibold leading-7">
                    Menos fricción. Más claridad para tomar decisiones sobre tu salud.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Nuestra forma de trabajar" className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl divide-y divide-slate-200 px-6 md:grid-cols-3 md:divide-x md:divide-y-0">
          <TrustSignal
            icon="clinical"
            title="Criterio médico"
            description="Presente antes de cada emisión"
          />
          <TrustSignal
            icon="evidence"
            title="Evidencia clínica"
            description="Protocolos que orientan, no improvisan"
          />
          <TrustSignal
            icon="clarity"
            title="Experiencia simple"
            description="Información entendible de principio a fin"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Por qué existimos
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-slate-950 md:text-5xl">
              Una fricción clínica que valía la pena resolver.
            </h2>
          </div>

          <div className="space-y-6 text-lg leading-8 text-slate-600">
            <p>
              En la práctica médica veíamos una situación repetirse: personas que necesitaban un
              chequeo o control preventivo, pero encontraban un proceso largo, poco claro o
              innecesariamente complejo para obtener una orden.
            </p>
            <p>
              También veíamos el problema opuesto: exámenes solicitados sin una razón clínica
              suficiente, que agregaban costo y preocupación sin necesariamente aportar valor.
            </p>
            <p className="border-l-2 border-emerald-500 pl-6 font-medium text-slate-950">
              Veramed surge para acercar lo que sí aporta y evitar el ruido: tecnología al servicio
              del criterio médico, no en reemplazo de él.
            </p>
          </div>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2">
          <article className="relative overflow-hidden rounded-[2rem] border border-emerald-200 bg-emerald-50 p-7 md:p-9">
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full border-[24px] border-emerald-100" />
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-white">
              <PlusIcon />
            </span>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
              Lo que facilitamos
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              Acceso cuando un examen puede ser útil.
            </h3>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-700">
              Un recorrido digital ordenado para que la prevención y los controles sean más
              accesibles, sin perder el respaldo clínico.
            </p>
          </article>

          <article className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 p-7 text-white md:p-9">
            <div className="absolute -bottom-16 -right-10 h-48 w-48 rounded-full bg-emerald-500/15 blur-2xl" />
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-emerald-300 ring-1 ring-white/15">
              <MinusIcon />
            </span>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Lo que evitamos
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight">
              Estudios que no agregan valor clínico.
            </h3>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
              Más exámenes no siempre significa mejor salud. Queremos que cada recomendación tenga
              una razón comprensible detrás.
            </p>
          </article>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Nuestros principios
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-slate-950 md:text-5xl">
              Lo que guía cada decisión que tomamos.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {principles.map((principle) => (
              <article
                key={principle.number}
                className="group rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.45)] transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_24px_60px_-38px_rgba(5,150,105,0.38)]"
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
                <p className="mt-3 text-sm leading-7 text-slate-600">{principle.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-20">
          <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[2.25rem] bg-[linear-gradient(145deg,#ecfdf5,#f8fafc)] p-5 shadow-[0_28px_80px_-44px_rgba(15,23,42,0.42)] ring-1 ring-slate-200">
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
              El equipo detrás
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-slate-950 md:text-5xl">
              Distintas disciplinas, una misma convicción.
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Veramed reúne experiencia en medicina clínica, salud digital y desarrollo
              tecnológico. Creemos que una buena experiencia de salud no solo debe ser rigurosa:
              también tiene que sentirse humana, simple y segura.
            </p>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Diseñamos cada flujo para que la tecnología reduzca barreras y permita que el criterio
              clínico llegue de una forma más clara a cada persona.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Antes de tu orden
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                Un proceso pensado para dar confianza.
              </h2>
            </div>

            <ol className="divide-y divide-white/10 border-y border-white/10">
              {clinicalSteps.map((item) => (
                <li key={item.step} className="grid gap-4 py-6 sm:grid-cols-[3rem_1fr]">
                  <span className="text-sm font-semibold text-emerald-300">{item.step}</span>
                  <div>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-emerald-50">
        <div className="pointer-events-none absolute -right-20 -top-24 -z-10 h-80 w-80 rounded-full border-[55px] border-emerald-100" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 -z-10 h-96 w-96 rounded-full bg-white/70 blur-2xl" />
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="rounded-[2.25rem] border border-emerald-200 bg-white/80 px-7 py-10 text-center shadow-[0_30px_80px_-55px_rgba(5,150,105,0.5)] backdrop-blur md:px-16 md:py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Salud con sentido
            </p>
            <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-slate-950 md:text-5xl">
              Tu salud merece decisiones claras.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">
              Conoce las alternativas de Veramed y encuentra el flujo que mejor responde a lo que
              necesitas hoy.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/#servicios"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Explorar servicios
                <ArrowIcon />
              </Link>
              <Link
                href="/pacientes"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:border-slate-400"
              >
                Información para pacientes
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function TrustSignal({
  icon,
  title,
  description,
}: {
  icon: "clinical" | "evidence" | "clarity";
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-4 py-7 md:px-7 first:md:pl-0 last:md:pr-0">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        <PrincipleIcon name={icon} />
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
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

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
