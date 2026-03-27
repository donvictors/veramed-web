import type { Metadata } from "next";
import Image from "next/image";

const PAGE_URL =
  "https://www.veramed.cl/blog/colonoscopia-que-es-como-prepararse-y-que-esperar-del-examen";
const PAGE_TITLE = "Colonoscopía: qué es, cómo prepararse y qué esperar del examen | Veramed";
const PAGE_DESCRIPTION =
  "Qué es una colonoscopía, cómo prepararse y qué esperar del procedimiento para detectar pólipos y cáncer de colon a tiempo.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    "colonoscopía",
    "qué es una colonoscopía",
    "preparación para colonoscopía",
    "examen de colon",
    "cáncer de colon",
    "pólipos de colon",
    "colonoscopía en Chile",
  ],
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
        url: "/brand/blog-colon.png",
        width: 1366,
        height: 768,
        alt: "Colonoscopía: preparación y qué esperar",
      },
    ],
  },
};

export default function ColonoscopyArticlePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Screening cáncer
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Colonoscopía: qué es, cómo prepararse y qué esperar del examen
          </h1>
          <p className="mt-4 text-sm text-slate-500">20 marzo 2026</p>

          <div className="mt-8 space-y-6 text-sm leading-8 text-slate-700">
            <p>
              Si tu médico te pidió una colonoscopía y no tienes muy claro de qué se trata, aquí te
              lo explicamos en simple. Es un examen muy importante porque permite mirar por dentro
              el colon o intestino grueso, detectar problemas a tiempo e incluso prevenir el cáncer
              de colon.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <Image
              src="/brand/blog-colon.png"
              alt="Colonoscopía y prevención de cáncer de colon"
              width={1366}
              height={768}
              className="h-auto w-full"
              priority
            />
          </div>

          <div className="mt-8 space-y-6 text-sm leading-8 text-slate-700">
            <section>
              <h2 className="text-xl font-semibold text-slate-950">¿Qué es una colonoscopía?</h2>
              <p className="mt-3">
                La colonoscopía es un procedimiento en que el médico usa un tubo delgado y flexible
                con una cámara en la punta para revisar el interior del colon y del recto.
              </p>
              <p className="mt-3">Este examen se usa principalmente para:</p>
              <ul className="mt-3 space-y-1 pl-5">
                <li>detectar cáncer de colon</li>
                <li>
                  encontrar pólipos, que son pequeños crecimientos que a veces pueden transformarse
                  en cáncer
                </li>
                <li>estudiar síntomas o hallazgos anormales en otros exámenes</li>
              </ul>
              <p className="mt-3">
                Lo bueno es que, si durante la colonoscopía encuentran pólipos, muchas veces se
                pueden sacar en el mismo procedimiento, lo que ayuda a prevenir problemas futuros.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                ¿Cuándo te pueden pedir una colonoscopía?
              </h2>
              <p className="mt-3">Tu médico podría indicarla si tienes alguno de estos casos:</p>
              <ul className="mt-3 space-y-1 pl-5">
                <li>sangre en las deposiciones</li>
                <li>cambios en tu ritmo intestinal</li>
                <li>anemia</li>
                <li>dolor abdominal o rectal que no se explica fácilmente</li>
                <li>exámenes previos alterados</li>
                <li>antecedentes personales de pólipos o cáncer de colon</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">¿Cómo hay que prepararse?</h2>
              <p className="mt-3">
                La preparación es una parte clave. De hecho, si el colon no está bien limpio, el
                examen puede no verse bien y quizás haya que repetirlo.
              </p>
              <p className="mt-3">En general, la preparación incluye:</p>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                1. Seguir indicaciones de comida y bebida
              </h3>
              <p className="mt-2">
                Algunos días antes, te pueden pedir una alimentación baja en residuos, es decir,
                con menos fibra y alimentos difíciles de digerir. Y el día previo, muchas veces hay
                que tomar solo líquidos transparentes.
              </p>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                2. Tomar la preparación intestinal
              </h3>
              <p className="mt-2">
                Te van a indicar una bebida especial que produce diarrea líquida para limpiar el
                colon. Aunque sea incómoda, es súper importante tomarla completa. Esa limpieza
                permite que el médico vea bien la mucosa del intestino.
              </p>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                3. Avisar qué medicamentos usas
              </h3>
              <p className="mt-2">
                Es importante contar si tomas anticoagulantes, suplementos, remedios naturales o si
                tienes problemas de sangrado, alergias o enfermedades previas.
              </p>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                4. Organizar tu vuelta a casa
              </h3>
              <p className="mt-2">
                Como normalmente te dan medicamentos para relajarte o dormirte durante el examen,
                no deberías manejar después. Idealmente, alguien te acompañe o te vaya a buscar.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                ¿Qué pasa durante la colonoscopía?
              </h2>
              <p className="mt-3">
                Antes de comenzar, te ponen una vía en la vena para administrar líquidos y
                medicamentos. Luego recibes sedación, y en algunos casos anestesia, para que estés
                relajado o dormido.
              </p>
              <p className="mt-3">
                Después, el médico introduce suavemente el colonoscopio por el ano y avanza por el
                recto y el colon mientras observa las imágenes de la cámara.
              </p>
              <p className="mt-3">Durante el procedimiento puede:</p>
              <ul className="mt-3 space-y-1 pl-5">
                <li>revisar todo el colon</li>
                <li>tomar una biopsia</li>
                <li>sacar pólipos si encuentra alguno</li>
              </ul>
              <p className="mt-3">
                La mayoría de las personas no siente dolor durante el examen, especialmente por la
                sedación. Además, si toman biopsias o sacan pólipos, eso generalmente no se siente.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                ¿Qué pasa después del examen?
              </h2>
              <p className="mt-3">
                Después te dejan un rato en observación mientras pasa el efecto de la sedación. Es
                normal quedar algo atontado o con sueño por unas horas.
              </p>
              <p className="mt-3">En general:</p>
              <ul className="mt-3 space-y-1 pl-5">
                <li>puedes retomar la comida habitual según indicación médica</li>
                <li>no deberías manejar ni trabajar el resto del día</li>
                <li>
                  te dirán cuándo reiniciar medicamentos que hubieras suspendido antes del examen
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                ¿La colonoscopía tiene riesgos?
              </h2>
              <p className="mt-3">
                Sí, aunque en general es un examen seguro. Como todo procedimiento médico, tiene
                riesgos poco frecuentes, entre ellos:
              </p>
              <ul className="mt-3 space-y-1 pl-5">
                <li>sangrado, especialmente si se sacan pólipos</li>
                <li>lesión o perforación del colon</li>
                <li>infección</li>
              </ul>
              <p className="mt-3">
                Tu equipo de salud te explicará las señales de alarma y cuándo consultar después del
                examen. También es importante que preguntes todo lo que no entiendas antes de irte
                a casa.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">En resumen</h2>
              <p className="mt-3">
                La colonoscopía es un examen muy útil para detectar y prevenir enfermedades del
                colon, incluido el cáncer colorrectal. Aunque la preparación puede ser lo más
                incómodo, vale la pena porque mejora mucho la calidad del examen.
              </p>
              <p className="mt-3">
                Si te la indicaron, no te asustes: es un procedimiento habitual, generalmente bien
                tolerado y muy importante para cuidar tu salud.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
