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

function ResourceCard({ item }: { item: ResourceItem }) {
  const isAvailable = item.status !== "coming_soon" && Boolean(item.href);

  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {item.type}
        </span>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>

      {isAvailable ? (
        <Link
          href={item.href!}
          target={item.type === "Video externo" ? "_blank" : undefined}
          rel={item.type === "Video externo" ? "noreferrer" : undefined}
          className="mt-4 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Abrir recurso
        </Link>
      ) : (
        <span className="mt-4 inline-flex rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
          Próximamente
        </span>
      )}
    </article>
  );
}

export default function PacientesPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Pacientes
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Recursos para pacientes
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            Esta sección reúne material útil para que puedas entender, preparar y acompañar tus
            controles de salud de forma simple.
          </p>
        </section>

        <section className="mt-8 rounded-[1.75rem] border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Lectura recomendada
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Blog de Veramed</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Artículos en lenguaje claro sobre prevención, exámenes de salud y decisiones clínicas
            frecuentes.
          </p>
          <Link
            href="/blog"
            className="mt-4 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Ir al blog
          </Link>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-slate-950">Recursos en PDF</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {pdfResources.map((item) => (
              <ResourceCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-slate-950">Videos externos recomendados</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {videoResources.map((item) => (
              <ResourceCard key={item.title} item={item} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
