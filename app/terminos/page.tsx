export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Términos
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          Términos de uso
        </h1>
        <div className="mt-6 space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700">
          <p>
            Veramed entrega orientación para órdenes médicas ambulatorias en formato digital. El
            servicio no reemplaza consulta médica, diagnóstico ni atención de urgencia.
          </p>
          <p>
            La información visible en este MVP es referencial y sujeta a validación clínica antes
            de un uso formal. La aceptación final de una orden depende del profesional que la valide
            y del laboratorio donde se utilice.
          </p>
          <p>
            Ante síntomas de alarma, empeoramiento clínico o necesidad de atención inmediata,
            corresponde acudir a un servicio de urgencia o consultar con un profesional de salud.
          </p>
        </div>
      </div>
    </main>
  );
}
