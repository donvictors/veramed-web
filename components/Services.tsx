import Link from "next/link";

const services = [
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
              <span className="block lg:whitespace-nowrap">a los exámenes que tú necesitas.</span>
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-600 lg:pb-1">
            Diseñado para personas que necesitan ordenar un chequeo preventivo, controlar una
            enfermedad o llegar con exámenes a consultar a su médico por síntomas nuevos. De forma
            clara y precisa.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {services.map((service, index) => (
            <article
              key={service.title}
              className={`group flex h-full flex-col overflow-hidden rounded-[2rem] border p-5 transition duration-300 hover:-translate-y-1 ${
                service.highlighted
                  ? "border-amber-300 bg-gradient-to-b from-amber-50/70 to-white text-slate-950 shadow-[0_28px_80px_-48px_rgba(180,125,28,0.55)] hover:border-amber-400"
                  : "border-slate-200 bg-white text-slate-950 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.4)] hover:border-emerald-200"
              }`}
            >
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
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>

              <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                {service.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {service.description}
              </p>

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
                  Comenzar <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
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
