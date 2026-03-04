import Link from "next/link";

const trustChips = [
  "Guías clínicas vigentes",
  "Validación médica",
  "Orden imprimible",
  "Trazabilidad",
];

export default function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="grid items-start gap-10 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" />
            Los exámenes que necesitas a sólo un clic
          </p>

          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
            Órdenes médicas basadas en evidencia.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Completa tus datos y recibe una recomendación estructurada de exámenes preventivos,
            basada en la última evidencia nacional e internacional. 🧪
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#servicios"
              className="rounded-2xl bg-slate-950 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Solicitar orden 📄
            </Link>
            <Link
              href="#como-funciona"
              className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Ver proceso clínico 🔎
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {trustChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
              >
                {chip}
              </span>
            ))}
          </div>

          <div className="mt-8 max-w-2xl rounded-3xl border border-rose-200 bg-rose-50 p-5">
            <p className="text-sm font-semibold text-rose-900">No usar en caso de urgencia</p>
            <p className="mt-2 text-sm leading-6 text-rose-800">
              Si presentas{" "}
              <Link href="#faq-sintomas-alarma" className="font-semibold underline">
                síntomas de alarma
              </Link>{" "}
              debes consultar de inmediato con un profesional de salud.
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Evaluación inicial
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">
              Tu orden se prepara en tres etapas.
            </h2>
            <div className="mt-5 space-y-4">
              <ClinicalPoint
                title="1. Datos clínicos esenciales"
                description="Edad, sexo biológico y antecedentes básicos para orientar el panel."
              />
              <ClinicalPoint
                title="2. Recomendación explicada"
                description="Verás qué exámenes se sugieren, por qué y cómo prepararte."
              />
              <ClinicalPoint
                title="3. Validación médica"
                description="La emisión final queda sujeta a revisión clínica antes del uso formal."
              />
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-900">Importante</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Veramed entrega orientación para órdenes de laboratorio. No diagnostica, no reemplaza
              una consulta médica y no debe usarse como única base para decidir conductas ante
              síntomas o urgencias.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ClinicalPoint({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 rounded-2xl bg-white p-4">
      <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
        ✓
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}
