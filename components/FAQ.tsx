const faqs = [
  {
    question: "¿La orden es válida en cualquier laboratorio?",
    answer:
      "En este MVP la orden es una ficha clínica preparatoria. Su uso final depende de la validación médica y de las políticas del laboratorio donde quieras realizar la toma.",
  },
  {
    question: "¿Cuánto se demora la validación?",
    answer:
      "En la versión actual la validación está simulada para demostrar el flujo. En operación real, la meta es mantener tiempos acotados y visibles antes de la descarga.",
  },
  {
    question: "¿Qué incluye el precio?",
    answer:
      "Incluye el formulario guiado, la recomendación clínica inicial, la ficha de orden con preparación y el flujo de validación. No incluye la toma de muestras ni el costo del laboratorio.",
  },
  {
    question: "¿Qué datos guardan y por cuánto tiempo?",
    answer:
      "Se guardan los antecedentes necesarios para construir tu recomendación y su trazabilidad. En este MVP los datos viven localmente en tu navegador; una política definitiva debe formalizar tiempos de retención antes de producción.",
  },
  {
    question: "¿Esto reemplaza una consulta médica?",
    answer:
      "No. Es un apoyo para orientar una orden de laboratorio. No reemplaza evaluación clínica, diagnóstico, receta ni seguimiento médico.",
  },
  {
    question: "¿Puedo usarlo si tengo síntomas, embarazo o signos de alarma?",
    answer:
      "Si tienes síntomas nuevos, embarazo o cualquier red flag, la recomendación puede no ser suficiente. Frente a urgencia o duda clínica relevante, corresponde evaluación médica directa.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">FAQ</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Preguntas frecuentes en contexto Chile.
          </h2>
        </div>

        <div className="mt-10 grid gap-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-[1.5rem] border border-slate-200 bg-white p-5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-slate-950">
                {faq.question}
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
