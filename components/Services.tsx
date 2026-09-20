import Link from "next/link";

const examServices = [
  {
    title: "Chequeo preventivo",
    description:
      "Una recomendación orientada según tu edad, sexo biológico y tus antecedentes para cuidar tu salud antes de que aparezcan problemas.",
    href: "/chequeo",
    price: "$1.990",
    previousPrice: "$2.990",
    action: "Solicitar chequeo",
    points: [
      "Panel sugerido según tu perfil",
      "Preparación de cada examen",
      "Validación médica antes de emitir",
    ],
    highlighted: false,
  },
  {
    title: "Control de enfermedades",
    description:
      "Exámenes de seguimiento para condiciones crónicas, pensados para acompañar tu próximo control con tu médico tratante.",
    href: "/control-cronico",
    price: "$3.990",
    action: "Solicitar control",
    points: [
      "Selección según cada condición",
      "Antecedentes relevantes ordenados",
      "Orden médica digital validada",
    ],
    highlighted: false,
  },
  {
    title: "Evaluación de síntomas",
    description:
      "Describe lo que sientes y nuestro asistente de IA te entrevista para que te podamos sugerir los exámenes que necesitas antes de tu consulta médica.",
    href: "/sintomas",
    price: "$5.990",
    action: "Solicitar evaluación",
    points: [
      "Análisis estructurado de síntomas",
      "Sugerencia con contexto clínico",
      "Revisión médica antes de emitir",
    ],
    highlighted: true,
    bestSeller: true,
  },
];

const orderServices = [
  {
    title: "Kinesioterapia",
    description: "Sube tu certificado médico o informe de imagen. Revisamos el antecedente y, si corresponde, preparamos tu derivación a kinesioterapia.",
    eyebrow: "¿Ya tienes un diagnóstico y necesitas comenzar rehabilitación?",
    href: "/kinesioterapia",
    price: "$3.990",
    action: "Solicitar derivación",
    points: ["Revisión del antecedente", "Reglas clínicas versionadas", "Validación médica antes de emitir"],
    highlighted: false,
  },
  {
    title: "Renovar receta",
    description: "Solicita la renovación de medicamentos de uso habitual sin empezar una consulta desde cero.",
    eyebrow: "¿Se te terminó un tratamiento que ya utilizas?",
    note: "Sólo para tratamientos elegibles. No incluye medicamentos sujetos a control especial.",
    href: "/renovar-receta",
    price: "$4.990",
    action: "Renovar receta",
    points: ["Tratamientos habituales elegibles", "Encuesta breve", "Un médico valida la renovación"],
    highlighted: false,
  },
  {
    title: "Control de peso",
    description: "Responde una encuesta breve. Si cumples criterios para la vía simplificada, un médico revisará tu caso antes de emitir el tratamiento.",
    eyebrow: "Descubre gratis si podrías ser candidato a tratamiento médico para el control del peso.",
    href: "/control-peso",
    price: "$5.990",
    previousPrice: "$7.990",
    action: "Evaluar gratis",
    points: ["Evaluación gratuita", "Criterios clínicos determinísticos", "Revisión médica antes del tratamiento"],
    highlighted: true,
    bestSeller: true,
  },
];

export default function Services() {
  return (
    <section id="servicios" className="scroll-mt-20 border-y border-slate-200/80 bg-white/65">
      <div className="mx-auto max-w-6xl px-6 pb-10 pt-5 md:pb-12 md:pt-6">
        <div className="grid items-end gap-4 lg:grid-cols-[1.65fr_1fr] lg:gap-6">
          <div>
            <p className="veramed-kicker">Servicios</p>
            <h2 className="mt-2 text-3xl font-semibold leading-[1.1] tracking-tight text-slate-950 md:text-4xl lg:text-[clamp(2rem,3vw,2.75rem)]">
              <span className="block">El punto de entrada</span>
              <span className="block lg:whitespace-nowrap">a la atención que necesitas.</span>
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-600 lg:pb-1">
            Resuelve tus necesidades médicas de forma simple y online: desde un chequeo hasta
            evaluar síntomas, renovar recetas o solicitar derivaciones. Claro, seguro y sin
            trámites innecesarios.
          </p>
        </div>

        <ServiceGroup title="Exámenes" services={examServices} startIndex={1} />
        <ServiceGroup title="Órdenes, derivaciones y tratamiento" services={orderServices} startIndex={4} />
      </div>
    </section>
  );
}

type Service = {
  title: string;
  description: string;
  eyebrow?: string;
  note?: string;
  href: string;
  price: string;
  previousPrice?: string;
  action: string;
  points: string[];
  highlighted: boolean;
  bestSeller?: boolean;
};

function ServiceGroup({ title, services, startIndex }: { title: string; services: Service[]; startIndex: number }) {
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
      <div className="mt-3 grid gap-4 lg:grid-cols-3">
          {services.map((service, index) => (
            <article
              key={service.title}
              className={`group relative flex h-full flex-col overflow-hidden rounded-[2rem] border p-5 transition duration-300 hover:-translate-y-1 ${
                service.highlighted
                  ? "border-amber-300 bg-gradient-to-b from-amber-50/70 to-white text-slate-950 shadow-[0_28px_80px_-48px_rgba(180,125,28,0.55)] hover:border-amber-400"
                  : "border-slate-200 bg-white text-slate-950 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] hover:border-emerald-200"
              }`}
            >
              {service.bestSeller ? (
                <span className="absolute -right-10 top-5 z-10 w-36 rotate-45 bg-amber-600 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-sm">
                  Más vendido
                </span>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <span
                  className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                    service.highlighted ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  Disponible
                </span>
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-2xl text-xs font-bold ${
                    service.highlighted
                      ? "border border-amber-200 bg-amber-100 text-amber-800"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {String(index + startIndex).padStart(2, "0")}
                </span>
              </div>

              <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                {service.title}
              </h3>
              {"eyebrow" in service && service.eyebrow ? <p className="mt-2 text-sm font-semibold leading-5 text-slate-800">{service.eyebrow}</p> : null}
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {service.description}
              </p>
              {"note" in service && service.note ? <p className="mt-2 text-xs leading-5 text-slate-500">{service.note}</p> : null}

              <div className={`my-3 h-px ${service.highlighted ? "bg-amber-200/70" : "bg-slate-100"}`} />

              <div className="space-y-2">
                {service.points.map((point) => (
                  <ServicePoint key={point} text={point} highlighted={service.highlighted} />
                ))}
              </div>

              <div className="mt-auto flex items-end justify-between gap-4 pt-4">
                <div>
                  {service.previousPrice ? (
                    <p className="text-xs text-slate-400 line-through">
                      {service.previousPrice}
                    </p>
                  ) : null}
                  <p className="text-xl font-semibold text-slate-950">
                    {service.price}
                  </p>
                </div>
                <Link
                  href={service.href}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    service.highlighted
                      ? "bg-amber-600 text-white hover:bg-amber-700"
                      : "bg-slate-950 text-white hover:bg-emerald-700"
                  }`}
                  aria-label={service.action}
                >
                  {service.action} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
      </div>
    </div>
  );
}

function ServicePoint({ text, highlighted }: { text: string; highlighted: boolean }) {
  return (
    <div className="flex items-start gap-2 text-sm leading-5">
      <span
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          highlighted ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"
        }`}
      >
        ✓
      </span>
      <span className="text-slate-700">{text}</span>
    </div>
  );
}
