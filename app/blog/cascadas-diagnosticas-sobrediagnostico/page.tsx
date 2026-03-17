import type { Metadata } from "next";
import Image from "next/image";

const PAGE_URL = "https://www.veramed.cl/blog/cascadas-diagnosticas-sobrediagnostico";
const PAGE_TITLE =
  "Cascadas diagnósticas y sobrediagnóstico: cuando más exámenes no es mejor | Veramed";
const PAGE_DESCRIPTION =
  "Qué son las cascadas diagnósticas y el sobrediagnóstico, y cómo evitar exámenes innecesarios en medicina preventiva.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    siteName: "Veramed",
    type: "article",
    locale: "es_CL",
    images: [
      {
        url: "/brand/voxel-cascadas_dg.png",
        width: 1366,
        height: 768,
        alt: "Cascadas diagnósticas y sobrediagnóstico",
      },
    ],
  },
};

export default function DiagnosticCascadeArticlePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Decisiones clínicas
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Cascadas diagnósticas y sobrediagnóstico: cuando más exámenes no es mejor
          </h1>
          <p className="mt-4 text-sm text-slate-500">13 marzo 2026</p>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <Image
              src="/brand/voxel-cascadas_dg.png"
              alt="Representación de cascadas diagnósticas y sobrediagnóstico"
              width={1366}
              height={768}
              className="h-auto w-full"
              priority
            />
          </div>

          <div className="mt-8 space-y-6 text-sm leading-8 text-slate-700">
            <p>
              En medicina solemos pensar que más exámenes significan mejor atención. Hoy contamos
              con escáneres, resonancias y análisis de laboratorio cada vez más sensibles, capaces
              de detectar alteraciones muy pequeñas en el cuerpo.
            </p>
            <p>
              Pero esta capacidad también ha generado un fenómeno cada vez más reconocido en salud:
              las cascadas diagnósticas y el sobrediagnóstico.
            </p>
            <p>
              Comprender estos conceptos es clave para tomar mejores decisiones clínicas y evitar
              exámenes médicos innecesarios.
            </p>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                ¿Qué son las cascadas diagnósticas?
              </h2>
              <p className="mt-3">
                Una cascada diagnóstica ocurre cuando un examen revela un hallazgo incidental,
                algo inesperado que no estaba relacionado con el motivo de consulta, y ese hallazgo
                desencadena una cadena de nuevos estudios.
              </p>
              <p className="mt-3">Por ejemplo:</p>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                <li>Un escáner solicitado por dolor lumbar detecta una pequeña lesión en el riñón.</li>
                <li>Se pide una resonancia para caracterizarla mejor.</li>
                <li>Luego controles seriados o incluso una biopsia.</li>
              </ul>
              <p className="mt-3">
                En muchos casos, el hallazgo inicial nunca habría causado síntomas ni problemas de
                salud. Sin embargo, el descubrimiento activa una serie de decisiones médicas que
                pueden generar ansiedad, riesgos y costos innecesarios.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">Qué es el sobrediagnóstico</h2>
              <p className="mt-3">
                El sobrediagnóstico ocurre cuando detectamos una enfermedad que es real desde el
                punto de vista médico, pero que nunca habría afectado la vida del paciente.
              </p>
              <p className="mt-3">
                Esto sucede especialmente en contextos de screening o prevención, donde buscamos
                enfermedades en personas sanas con tecnologías muy sensibles.
              </p>
              <p className="mt-3">
                Mientras más buscamos, más cosas encontramos.
                <br />
                Pero no todo lo que encontramos necesita tratamiento.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                Por qué más exámenes médicos no siempre es mejor
              </h2>
              <p className="mt-3">Las cascadas diagnósticas pueden tener consecuencias importantes:</p>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                <li>Ansiedad para el paciente</li>
                <li>Procedimientos innecesarios</li>
                <li>Riesgos médicos adicionales</li>
                <li>Costos para el sistema de salud</li>
              </ul>
              <p className="mt-3">
                Por eso, la medicina moderna está avanzando hacia un principio clave: pedir el
                examen correcto para la persona correcta, en el momento correcto.
              </p>
              <p className="mt-3">Antes de solicitar un estudio, es útil preguntarse:</p>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                <li>¿Este examen cambiará realmente el manejo clínico?</li>
                <li>¿Cuál es la probabilidad de encontrar algo relevante?</li>
                <li>¿Qué pasará si aparece un hallazgo incidental?</li>
              </ul>
              <p className="mt-3">
                Estas preguntas ayudan a evitar sobrediagnóstico y cascadas diagnósticas
                innecesarias.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                El desafío de la medicina moderna
              </h2>
              <p className="mt-3">
                La paradoja de la medicina actual es que tenemos más información que nunca, pero
                esa información también puede generar más incertidumbre.
              </p>
              <p className="mt-3">
                El desafío ya no es solo detectar enfermedades, sino interpretar correctamente los
                datos clínicos y priorizar lo que realmente importa para el paciente.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                Hacia decisiones clínicas más inteligentes
              </h2>
              <p className="mt-3">Aquí es donde comienza a cambiar el paradigma.</p>
              <p className="mt-3">
                En lugar de acumular más datos, el futuro de la medicina está en usar inteligencia
                para interpretar mejor los datos que ya existen: historias clínicas, exámenes
                previos, evolución del paciente y contexto clínico.
              </p>
              <p className="mt-3">
                Ese es precisamente el enfoque que está impulsando Veramed: herramientas de
                inteligencia clínica diseñadas para ayudar a médicos a sintetizar información
                relevante, evitar cascadas diagnósticas innecesarias y apoyar decisiones clínicas
                más precisas.
              </p>
              <p className="mt-3">
                Porque en salud, muchas veces la mejor decisión no es pedir más exámenes, sino
                entender mejor los que ya tenemos.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
