export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Nosotros
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          ¿Quiénes somos?
        </h1>

        <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700">
          <p>
            Veramed es una plataforma de orientación clínica para órdenes de exámenes ambulatorios,
            diseñada para entregar recomendaciones claras, estructuradas y basadas en evidencia.
          </p>
          <p className="mt-4">
            Nuestro objetivo es facilitar el acceso a procesos preventivos y de control, con
            información simple de entender y validación médica antes de la emisión de cada orden.
          </p>
          <p className="mt-4">
            Este servicio no reemplaza una consulta médica ni corresponde a manejo de urgencias.
          </p>
        </div>
      </div>
    </main>
  );
}
