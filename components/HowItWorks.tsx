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
    <section id="como-funciona" className="border-y border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Cómo funciona
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Tú entregas la información, nosotros te entregamos los pasos para cuidar tu salud.
          </h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.number}
              className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6"
            >
              <div className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold tracking-[0.18em] text-slate-600">
                {step.number}
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-950">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
              <div className="mt-6 space-y-2 text-sm text-slate-700">
                {step.bullets.map((bullet) => (
                  <ChecklistLine key={bullet} text={bullet} />
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ChecklistLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
      <span>{text}</span>
    </div>
  );
}
