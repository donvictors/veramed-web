import Image from "next/image";
import Link from "next/link";

type ResourceItem = {
  title: string;
  description: string;
  href?: string;
  type: "PDF" | "Video externo";
  status?: "available" | "coming_soon";
};

const pdfResources: ResourceItem[] = [
  {
    title: "Hoja de registro de presión arterial",
    description:
      "Planilla en PDF para registrar tus mediciones de presión y compartirlas con tu médico.",
    href: "/documentos/registro_presion_veramed.pdf",
    type: "PDF",
    status: "available",
  },
  {
    title: "Listado de equipos AMPA validados",
    description:
      "Documento en PDF para revisar qué dispositivos de presión arterial están validados.",
    href: "/documentos/ampa-validados.pdf",
    type: "PDF",
    status: "available",
  },
  {
    title: "Administración de oxígeno en casa con concentrador",
    description:
      "Guía práctica para uso domiciliario seguro de concentrador de oxígeno y cuidados básicos.",
    type: "PDF",
    status: "coming_soon",
  },
];

const videoResources: ResourceItem[] = [
  {
    title: "Cómo medir la presión arterial en casa",
    description:
      "Video externo con recomendaciones prácticas para una toma correcta de presión arterial.",
    href: "https://www.youtube.com/results?search_query=como+medir+presion+arterial+en+casa",
    type: "Video externo",
    status: "available",
  },
  {
    title: "Uso de concentrador de oxígeno domiciliario",
    description:
      "Video externo orientativo sobre instalación, uso diario y medidas de seguridad en casa.",
    href: "https://www.youtube.com/results?search_query=uso+de+concentrador+de+oxigeno+en+casa",
    type: "Video externo",
    status: "available",
  },
];

function ResourceCard({ item, index }: { item: ResourceItem; index: number }) {
  const isAvailable = item.status !== "coming_soon" && Boolean(item.href);

  return (
    <article className="veramed-panel group flex h-full flex-col p-6 transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_24px_70px_-44px_rgba(15,118,110,0.45)]">
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-bold text-emerald-700">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-600">
          {item.type}
        </span>
      </div>

      <h3 className="mt-8 text-xl font-semibold tracking-tight text-slate-950">{item.title}</h3>
      <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{item.description}</p>

      {isAvailable ? (
        <Link
          href={item.href!}
          target={item.type === "Video externo" ? "_blank" : undefined}
          rel={item.type === "Video externo" ? "noreferrer" : undefined}
          className="veramed-secondary-button mt-6 w-fit group-hover:border-emerald-300"
        >
          Abrir recurso <span aria-hidden="true">↗</span>
        </Link>
      ) : (
        <span className="mt-6 inline-flex w-fit rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
          Próximamente
        </span>
      )}
    </article>
  );
}

export default function PacientesPage() {
  return (
    <main className="veramed-page min-h-screen text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <section className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="veramed-kicker">Pacientes</p>
            <h1 className="veramed-display mt-5 max-w-3xl text-4xl md:text-6xl">
              Herramientas para entender y acompañar tu salud.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              Recursos simples para preparar tus controles, registrar información importante y
              conversar con tu médico con mayor claridad.
            </p>
          </div>

          <div className="veramed-grid-surface relative min-h-[22rem] overflow-hidden p-7">
            <div className="relative z-10 max-w-xs rounded-3xl border border-white/70 bg-white/80 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Material educativo
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Descarga guías, revisa videos y encuentra contenidos creados para apoyar decisiones
                informadas.
              </p>
            </div>
            <Image
              src="/brand/voxel-patient-v2.png"
              alt="Paciente de Veramed revisando información de salud"
              width={360}
              height={360}
              className="absolute -bottom-14 -right-12 h-auto w-72 object-contain md:w-80"
              priority
            />
          </div>
        </section>

        <section className="mt-20">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="veramed-kicker">Para descargar</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Recursos en PDF
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-slate-600">
              Documentos prácticos que puedes guardar, completar y compartir en tu próximo control.
            </p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {pdfResources.map((item, index) => (
              <ResourceCard key={item.title} item={item} index={index} />
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <div className="veramed-dark-panel relative overflow-hidden p-8 md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Lectura recomendada
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              Salud explicada sin complicaciones.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Artículos sobre prevención, exámenes de salud y decisiones clínicas frecuentes.
            </p>
            <Link
              href="/blog"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Explorar el blog <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {videoResources.map((item, index) => (
              <ResourceCard key={item.title} item={item} index={index} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
