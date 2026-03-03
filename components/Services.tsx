import Link from "next/link";

export default function Services() {
  return (
    <section id="servicios" className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Servicios
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Un punto de entrada simple para laboratorio ambulatorio.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Diseñado para personas que necesitan ordenar un chequeo preventivo de forma clara y
            con expectativa realista sobre sus alcances.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_-44px_rgba(15,23,42,0.45)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Activo hoy
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">Chequeo preventivo</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Recomendación orientada por edad, sexo biológico y antecedentes básicos, con
                  orden imprimible y preparación sugerida.
                </p>
              </div>
              <span className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                $1.990
              </span>
            </div>

            <div className="mt-6 grid gap-3 text-sm text-slate-700">
              <ServicePoint text="Resumen clínico del panel sugerido." />
              <ServicePoint text="Ficha de orden con exámenes, muestra y preparación." />
              <ServicePoint text="Flujo de validación médica simulado para MVP." />
            </div>

            <Link
              href="/chequeo"
              className="mt-8 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Solicitar chequeo
            </Link>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Próximamente
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                  Evaluación por síntomas
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Flujo conversacional para orientar preguntas, detectar red flags y preparar una
                  orden inicial de estudio cuando corresponda.
                </p>
              </div>
              <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                En preparación
              </span>
            </div>

            <div className="mt-6 grid gap-3 text-sm text-slate-700">
              <ServicePoint text="Interacción conversacional inspirada en Ada." />
              <ServicePoint text="Checklist de síntomas de alarma y derivación." />
              <ServicePoint text="Validación humana antes de emisión formal." />
            </div>

            <button
              type="button"
              disabled
              className="mt-8 inline-flex cursor-not-allowed rounded-2xl border border-slate-300 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-500"
            >
              Próximamente
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}

function ServicePoint({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
      <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">
        ✓
      </span>
      <span>{text}</span>
    </div>
  );
}
