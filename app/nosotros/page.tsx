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
            Veramed es una plataforma digital creada por médicos para ayudar a las personas a
            acceder de forma más simple y segura a exámenes de salud.
          </p>
          <p className="mt-4">
            Nuestro objetivo es facilitar el acceso a la prevención y al control médico,
            entregando recomendaciones claras y estructuradas sobre qué exámenes pueden ser útiles
            en cada caso, siempre basadas en evidencia científica y guías clínicas.
          </p>
          <p className="mt-4">
            La idea detrás de Veramed nace de una experiencia común en la práctica médica: muchas
            personas necesitan realizarse exámenes de control o chequeos preventivos, pero el
            proceso para obtener una orden médica puede ser largo, poco claro o innecesariamente
            complejo. Al mismo tiempo, también vemos con frecuencia lo contrario: personas que
            terminan haciéndose exámenes que no siempre aportan valor clínico.
          </p>
          <p className="mt-4">
            Por eso creamos Veramed: una herramienta que busca facilitar el acceso a exámenes
            cuando son útiles y evitar estudios innecesarios, ayudando a tomar decisiones de salud
            de forma más informada. 🩺
          </p>
          <p className="mt-4">
            Antes de emitir una orden, cada solicitud pasa por un proceso de evaluación y
            validación médica, utilizando protocolos basados en medicina basada en evidencia. El
            resultado se presenta en un formato simple y comprensible para el usuario.
          </p>
          <p className="mt-4">
            Veramed está construido por un equipo con experiencia en medicina clínica, salud
            digital y desarrollo tecnológico, con la convicción de que la tecnología puede mejorar
            el acceso a la prevención y al cuidado de la salud. 💻
          </p>
        </div>
      </div>
    </main>
  );
}
