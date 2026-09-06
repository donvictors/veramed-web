import Image from "next/image";

const steps = [
  {
    number: "01",
    title: "Completa tus datos",
    description:
      "Ingresas antecedentes básicos en un flujo corto, estructurado y fácil de revisar.",
    bullets: [
      "Te toma menos de 5 minutos",
      "Preguntas claras y precisas",
      "Tu info queda ordenada para análisis",
    ],
  },
  {
    number: "02",
    title: "Recibes una recomendación de exámenes",
    description:
      "Se presenta el set sugerido con fundamento clínico, preparación y condiciones de uso.",
    bullets: [
      "Un set hecho a tu medida",
      "El “por qué” de cada examen",
      "Indicaciones de preparación y cuándo hacerlos",
    ],
  },
  {
    number: "03",
    title: "Validación por médico acreditado y emisión",
    description:
      "La orden queda lista para revisión médica y luego puede usarse en un laboratorio.",
    bullets: [
      "Validación médica antes de emitir",
      "Orden lista para usar en laboratorio",
      "Respaldo clínico de los exámenes",
    ],
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <div className="max-w-3xl">
          <p className="veramed-kicker">Cómo funciona</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            De tus antecedentes a una orden clara.
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">
            Un proceso guiado que organiza la información necesaria y te muestra cada decisión antes
            de avanzar.
          </p>
        </div>

        <div className="relative mt-12 pb-12 md:pb-16">
          <div className="grid gap-5 md:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.number}
                className="veramed-panel group relative overflow-hidden p-7 transition duration-300 hover:-translate-y-1 hover:border-emerald-200"
              >
                <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-emerald-700">
                  {step.number}
                </div>
                <h3 className="mt-7 text-xl font-semibold tracking-tight text-slate-950">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
                <div className="mt-6 space-y-2 text-sm text-slate-700">
                  {step.bullets.map((bullet) => (
                    <ChecklistLine key={bullet} text={bullet} />
                  ))}
                </div>
                <span className="pointer-events-none absolute -bottom-10 -right-7 text-[8rem] font-bold leading-none text-slate-100 transition group-hover:text-emerald-50">
                  {step.number}
                </span>
              </article>
            ))}
          </div>

          <div className="pointer-events-none absolute -bottom-1 left-[67.5%] hidden -translate-x-1/2 lg:block">
            <Image
              src="/brand/voxel-doc.png"
              alt="Médico en estilo voxel"
              width={92}
              height={92}
              className="h-[92px] w-[92px] object-contain opacity-80"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ChecklistLine({ text }: { text: string }) {
  return (
    <div className="relative z-10 flex items-center gap-2">
      <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
      <span className="leading-6">{text}</span>
    </div>
  );
}
