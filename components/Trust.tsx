const trustCards = [
  {
    title: "Órdenes validadas por médicos registrados en SIS",
    body: "Todas las órdenes son validadas previo a su emisión por médicos registrados en la Superintendencia de Salud. Verifícalos aquí.",
    tone: "emerald",
  },
  {
    title: "Exámenes basados en la última evidencia y experiencia.",
    body: "Los exámenes solicitados están basados en las últimas guías internacionales de medicina preventiva, adaptadas a Chile por la experiencia de nuestro equipo médico de excelencia.",
    tone: "slate",
  },
  {
    title: "Privacidad",
    body: "Cada solicitud mantiene tus datos seguros y anónimos. Tu información de salud no es almacenada en nuestros servidores posterior a la emisión de la orden.",
    tone: "slate",
  },
  {
    title: "No usar en urgencias",
    body: "No corresponde para cuadros agudos, síntomas de alarma o decisiones clínicas inmediatas.",
    tone: "rose",
  },
];

export default function Trust() {
  return (
    <section id="confianza" className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Confianza clínica
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Tú salud en nuestras manos.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Veramed busca construir confianza desde la claridad: qué hace, qué no hace y bajo qué
            condiciones una orden puede considerarse lista para uso.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {trustCards.map((card) => (
            <article
              key={card.title}
              className={`rounded-[1.75rem] border p-5 ${
                card.tone === "rose"
                  ? "border-rose-200 bg-rose-50"
                  : card.tone === "emerald"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white">
                <TrustIcon tone={card.tone} />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-950">{card.title}</p>
              {card.title === "Órdenes validadas por médicos registrados en SIS" ? (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Todas las órdenes son validadas previo a su emisión por médicos registrados en la
                  Superintendencia de Salud. Verifícalos{" "}
                  <a
                    href="https://rnpi.superdesalud.gob.cl/#"
                    className="font-semibold text-slate-950 underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    aquí
                  </a>
                  .
                </p>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.body}</p>
              )}
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
            Declaración clínica visible
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-200">
            Este servicio entrega orientación para órdenes de exámenes ambulatorios. La validez
            final depende de la revisión médica, del laboratorio que ejecuta la toma y del contexto
            clínico real del paciente. No reemplaza consulta, diagnóstico ni manejo de urgencias.
          </p>
        </div>
      </div>
    </section>
  );
}

function TrustIcon({ tone }: { tone: string }) {
  const stroke =
    tone === "rose" ? "#be123c" : tone === "emerald" ? "#047857" : "#334155";

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M12 3 5 6v5c0 5 3.4 8.2 7 10 3.6-1.8 7-5 7-10V6l-7-3Z"
        stroke={stroke}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m9.5 12.2 1.8 1.8 3.5-4"
        stroke={stroke}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
