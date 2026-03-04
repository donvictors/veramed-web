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
            Un punto de entrada simple para los exámenes que necesitas.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Diseñado para personas que necesitan ordenar un chequeo preventivo de forma clara y
            con expectativa realista sobre sus alcances.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <article className="flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_-44px_rgba(15,23,42,0.45)]">
            <div className="flex min-h-[20rem] flex-col">
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
              <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                <span className="text-white/60 line-through">$2.990</span>
                <span>$1.990</span>
              </span>
            </div>

            <div className="mt-6 grid flex-1 gap-3 text-sm text-slate-700">
              <ServicePoint text="Resumen clínico del panel sugerido." />
              <ServicePoint text="Ficha de orden con exámenes, muestra y preparación." />
              <ServicePoint text="Validación clínica antes de la emisión de la orden." />
            </div>

            <div className="mt-8">
              <Link
                href="/chequeo"
                className="mt-4 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Solicitar chequeo
              </Link>
            </div>
          </article>

          <article className="flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_-44px_rgba(15,23,42,0.45)]">
            <div className="flex min-h-[20rem] flex-col">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Activo hoy
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                  Exámenes de control por enfermedad/condición crónica
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Solicita exámenes de control para enfermedades o condiciones crónicas como
                  hipertensión, diabetes, hipotiroidismo y otras situaciones que requieran
                  seguimiento periódico, con una orden estructurada según el contexto clínico del
                  paciente.
                </p>
              </div>
              <span className="mt-6 inline-flex w-fit rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                $3.990
              </span>
            </div>

            <div className="mt-6 grid flex-1 gap-3 text-sm text-slate-700">
              <ServicePoint text="Selección de exámenes de control según enfermedad o condición crónica." />
              <ServicePoint text="Solicitud adaptada a antecedentes relevantes y seguimiento periódico." />
              <ServicePoint text="Orden médica digital con validación clínica antes de su emisión." />
            </div>

            <div className="mt-8">
              <Link
                href="/control-cronico"
                className="mt-4 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Solicitar control
              </Link>
            </div>
          </article>

          <article className="flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white p-7">
            <div className="flex min-h-[20rem] flex-col">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Próximamente...
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                  Evaluación por síntomas
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Si el paciente presenta síntomas, podrá escribirlos libremente. Una IA los
                  transformará en síntomas estructurados, hará preguntas de seguimiento basadas en
                  algoritmos internacionales y, según esas respuestas, recomendará un set de
                  exámenes que luego será validado por un médico en un plazo máximo de 12 horas.
                </p>
              </div>
              <span className="mt-6 inline-flex w-fit rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                $5.990
              </span>
            </div>

            <div className="mt-6 grid flex-1 gap-3 text-sm text-slate-700">
              <ServicePoint text="Ingreso libre de síntomas por parte del paciente." />
              <ServicePoint text="Estructuración clínica con IA y preguntas de seguimiento." />
              <ServicePoint text="Recomendación de exámenes y validación médica dentro de 12 horas." />
            </div>

            <div className="mt-8">
              <span className="mt-4 inline-flex rounded-2xl border border-slate-300 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-600">
                Disponible pronto...
              </span>
            </div>
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
