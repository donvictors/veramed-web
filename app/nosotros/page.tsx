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
            Veramed es una plataforma digital de orientación clínica para órdenes de exámenes
            ambulatorios.
          </p>
          <p className="mt-4">
            Nuestro objetivo es ayudar a las personas a acceder de forma más simple a procesos de
            prevención y control, entregando recomendaciones claras, estructuradas y basadas en
            evidencia médica.
          </p>
          <p className="mt-4">
            Antes de emitir una orden, cada solicitud pasa por un proceso de validación médica y se
            presenta en un formato fácil de entender para el usuario.
          </p>
          <p className="mt-4">
            Veramed no reemplaza una consulta médica o el proceso diagnóstico y no está diseñado
            para el manejo de urgencias.
          </p>
        </div>
      </div>
    </main>
  );
}
