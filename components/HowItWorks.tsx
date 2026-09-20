import Image from "next/image";

const steps = [
  {
    number: "01",
    title: "Cuéntanos qué necesitas",
    description:
      "Responde unas pocas preguntas o sube tus antecedentes según el servicio.",
    bullets: [
      "Te toma sólo unos minutos",
      "Preguntas claras y precisas",
      "Puedes adjuntar antecedentes de ser necesario",
    ],
  },
  {
    number: "02",
    title: "Veramed evalúa tu solicitud",
    description:
      "Organizamos tu información y aplicamos criterios clínicos para determinar qué corresponde en tu caso.",
    bullets: [
      "Recomendaciones adaptadas a tu situación",
      "Usamos IA para ayudarnos a revisar tu información más rápido",
      "Evaluamos tu necesidad con criterio médico",
    ],
  },
  {
    number: "03",
    title: "Un médico valida antes de emitir",
    description:
      "Cuando corresponde emitir una orden, receta o derivación, un médico revisa la solicitud antes de entregártela.",
    bullets: [
      "Validación médica antes de emitir",
      "Documentos digitales listos para usar",
      "Si necesitas otra evaluación, te indicamos el siguiente paso",
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
            Una solución clara para lo que necesitas.
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">
            Nos comprometemos a generar procesos de evaluación simples, que apliquen criterios
            clínicos reproducibles y muestren cómo es cada paso antes de continuar.
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
