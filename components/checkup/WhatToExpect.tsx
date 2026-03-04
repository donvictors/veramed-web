const items = [
  {
    title: "Validación médica",
    body: "La solicitud entra a revisión clínica antes de considerarse lista para uso formal.",
  },
  {
    title: "Descarga PDF",
    body: "Podrás imprimir o guardar la ficha de orden desde el navegador.",
  },
  {
    title: "Úsala en laboratorio",
    body: "Lleva la orden a tu laboratorio más cercano y toma tus exámenes. Algunos exámenes y procedimientos pueden estar disponibles sólo en algunos centros.",
  },
  {
    title: "Resultados y seguimiento",
    body: "Una vez tengas el resultado de tus exámenes agenda la hora con tu médico para revisar tus resultados con criterio clínico.",
  },
];

export default function WhatToExpect() {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Qué esperar
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            El flujo después de esta recomendación.
          </h2>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {items.map((item, index) => (
          <article key={item.title} className="rounded-3xl bg-slate-50 p-4">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-900">
              {index + 1}
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
