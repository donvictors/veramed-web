export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Privacidad
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          Privacidad y trazabilidad
        </h1>
        <div className="mt-6 space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700">
          <p>
            En este MVP, la información del chequeo se almacena localmente en el navegador del
            usuario para sostener el flujo entre páginas.
          </p>
          <p>
            Antes de operar en producción, Veramed debe formalizar políticas de retención,
            eliminación, acceso, respaldo y auditoría conforme a normativa aplicable y buenas
            prácticas de seguridad.
          </p>
          <p>
            La trazabilidad visible en esta versión busca mostrar estado, fecha y continuidad de la
            solicitud clínica, no constituir todavía un historial médico completo.
          </p>
        </div>
      </div>
    </main>
  );
}
