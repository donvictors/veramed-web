import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">
            Veramed
          </span>

          <Link
            href="/chequeo"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Solicitar chequeo
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="mb-3 inline-flex rounded-full border bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              Órdenes médicas basadas en guías clínicas
            </p>

            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Tu chequeo preventivo,
              <br />
              indicado médicamente.
            </h1>

            <p className="mt-4 text-base leading-relaxed text-slate-600 md:text-lg">
              Responde un formulario breve. Recibe una recomendación basada en
              guías clínicas. Validación médica en menos de 12 horas.
            </p>

            <div className="mt-8">
              <Link
                href="/chequeo"
                className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800"
              >
                Comenzar chequeo
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border bg-slate-50 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Lo que obtienes</h2>

            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li>• Panel de exámenes recomendado según edad y sexo</li>
              <li>• Explicación de cada examen</li>
              <li>• Orden médica imprimible</li>
              <li>• Validación médica real</li>
            </ul>

            <div className="mt-6 rounded-xl border bg-white p-4 text-xs text-slate-600">
              Veramed no reemplaza una consulta médica ni debe usarse en
              urgencias.
            </div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">
            Cómo funciona
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <Step
              number="1"
              title="Formulario breve"
              description="Edad, sexo, peso, talla y factores básicos."
            />
            <Step
              number="2"
              title="Recomendación guiada"
              description="Chequeo sugerido según reglas clínicas."
            />
            <Step
              number="3"
              title="Validación médica"
              description="Revisión médica y entrega de orden."
            />
          </div>
        </div>
      </section>

      {/* PRECIO */}
      <section className="border-t bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">
            Precio
          </h2>

          <div className="mt-8 max-w-md rounded-2xl border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">
              Chequeo preventivo
            </h3>

            <p className="mt-2 text-4xl font-semibold">
              $1.990
            </p>

            <p className="mt-3 text-sm text-slate-600">
              Recomendación basada en guías + validación médica.
            </p>

            <Link
              href="/chequeo"
              className="mt-6 inline-block rounded-xl bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              Solicitar ahora
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-slate-600">
          © {new Date().getFullYear()} Veramed. No usar en emergencias.
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
      <p className="mt-2 text-sm text-slate-600">
        {description}
      </p>
    </div>
  );
}