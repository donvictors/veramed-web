import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Subtle background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-slate-100 blur-3xl" />
        <div className="absolute top-40 right-[-120px] h-[420px] w-[420px] rounded-full bg-slate-50 blur-3xl" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/veramed-logo.png"
              alt="Veramed"
              width={300}
              height={100}
              priority
              className="h-14 w-auto"
            />
            <span className="hidden rounded-full border bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 sm:inline">
              beta
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="#servicios"
              className="hidden text-sm text-slate-600 hover:text-slate-900 md:inline"
            >
              Servicios
            </Link>
            <Link
              href="/chequeo"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
            >
              Solicitar chequeo
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          {/* Columna izquierda */}
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" />
              Órdenes médicas basadas en la última evidencia
            </p>

            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Tus órdenes médicas,
              <br />
              indicadas según la última evidencia.
            </h1>

            <p className="mt-4 text-base leading-relaxed text-slate-600 md:text-lg">
              Responde un breve formulario y recibe una recomendación personalizada basada en
              la última evidencia disponible a nivel nacional e internacional.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/chequeo"
                className="rounded-xl bg-slate-900 px-6 py-3 text-center text-sm font-medium text-white shadow-sm hover:bg-slate-800"
              >
                Comenzar chequeo
              </Link>
              <Link
                href="#como-funciona"
                className="rounded-xl border bg-white/70 px-6 py-3 text-center text-sm font-medium text-slate-900 shadow-sm hover:bg-white"
              >
                Cómo funciona
              </Link>
            </div>
          </div>

          {/* Columna derecha */}
          <div className="rounded-2xl border bg-white/70 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Lo que obtienes</h2>
              <span className="text-xs text-slate-500">≤ 12h</span>
            </div>

            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li>• Panel recomendado según edad y sexo biológico</li>
              <li>• Explicación de cada examen y sus motivos</li>
              <li>• Orden médica imprimible</li>
            </ul>

            <div className="mt-6 rounded-xl border bg-slate-50 p-4 text-xs text-slate-600">
              Veramed no reemplaza una consulta médica ni debe usarse en emergencias.
            </div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Cómo funciona</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <Step
              number="1"
              title="Llena un breve formulario"
              description="Usamos tu edad, sexo y antecedentes básicos para determinar el chequeo óptimo."
            />
            <Step
              number="2"
              title="Recomendación guiada"
              description="Chequeo sugerido según guías clínicas nacionales e internacionales."
            />
            <Step
              number="3"
              title="Validación médica"
              description="Órdenes revisadas y validadas por staff médico de Veramed."
            />
          </div>
        </div>
      </section>

      {/* SERVICIOS */}
      <section id="servicios" className="border-t bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Servicios</h2>
              <p className="mt-2 text-sm text-slate-600">
                Precios claros. Validación médica. Basado en guías.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {/* Chequeo */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Chequeo preventivo</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Para personas asintomáticas y sin enfermedades de base.
                  </p>
                </div>
                <p className="text-4xl font-semibold">$1.990</p>
              </div>

              <ul className="mt-6 space-y-2 text-sm text-slate-700">
                <li>• Reglas clínicas versionadas</li>
                <li>• Recomendación + explicación</li>
                <li>• Orden imprimible</li>
              </ul>

              <Link
                href="/chequeo"
                className="mt-6 inline-block w-full rounded-xl bg-slate-900 px-6 py-3 text-center text-sm font-medium text-white hover:bg-slate-800"
              >
                Solicitar ahora
              </Link>
            </div>

            {/* Próximamente */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Síntomas (próximamente)</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Preguntas dirigidas + exámenes recomendados + validación médica.
                  </p>
                </div>
                <span className="rounded-full border bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  en preparación
                </span>
              </div>

              <ul className="mt-6 space-y-2 text-sm text-slate-700">
                <li>• Clasificación por “síntoma core”</li>
                <li>• Checklist de alarma y derivación</li>
                <li>• Órdenes validadas por médico</li>
              </ul>

              <button
                disabled
                className="mt-6 inline-block w-full cursor-not-allowed rounded-xl border bg-slate-50 px-6 py-3 text-center text-sm font-medium text-slate-500"
              >
                Próximamente
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-slate-600">
          © {new Date().getFullYear()} Veramed. Una empresa de Grupo Vitaremu.
        </div>
      </footer>
    </main>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
        {number}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}