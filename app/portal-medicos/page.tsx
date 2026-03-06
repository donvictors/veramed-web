export default function PortalMedicosPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Portal médicos
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Acceso para médicos tratantes
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            Este espacio estará orientado a médicos que utilizan Veramed para revisar órdenes,
            apoyar continuidad de controles y facilitar seguimiento clínico de sus pacientes.
          </p>
        </section>
      </div>
    </main>
  );
}
