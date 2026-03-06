export default function PortalMedicosPage() {
  const pendingOrders = [
    {
      id: "sym_260306_0012",
      patient: "Sofía R. M.",
      requestedAt: "06-03-2026, 11:18",
      summary: "Disnea + dolor torácico leve de esfuerzo.",
      status: "En espera de validación",
    },
    {
      id: "sym_260306_0011",
      patient: "Carlos A. V.",
      requestedAt: "06-03-2026, 10:52",
      summary: "Tos persistente + baja de peso no intencional.",
      status: "En espera de validación",
    },
    {
      id: "sym_260306_0009",
      patient: "María F. P.",
      requestedAt: "06-03-2026, 09:41",
      summary: "Mareos recurrentes + cefalea progresiva.",
      status: "En espera de validación",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Portal médicos
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Consola de validación clínica
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            Solicitudes generadas en <span className="font-semibold text-slate-900">/sintomas</span>{" "}
            que están en espera de validación médica.
          </p>

          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[1.1fr_1fr_2fr_0.9fr] gap-3 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              <p>Solicitud</p>
              <p>Paciente</p>
              <p>Motivo informado</p>
              <p>Estado</p>
            </div>

            <div className="divide-y divide-slate-200">
              {pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="grid grid-cols-[1.1fr_1fr_2fr_0.9fr] gap-3 px-4 py-4 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{order.id}</p>
                    <p className="mt-1 text-xs text-slate-500">{order.requestedAt}</p>
                  </div>
                  <p className="text-slate-800">{order.patient}</p>
                  <p className="text-slate-700">{order.summary}</p>
                  <div className="inline-flex h-fit items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                    {order.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Vista de interfaz inicial. La integración con credenciales médicas y datos reales de
            /sintomas se habilitará en la siguiente iteración.
          </p>
        </section>
      </div>
    </main>
  );
}
