import type { Metadata } from "next";
import Image from "next/image";

const PAGE_URL = "https://www.veramed.cl/blog/polipos-de-colon-la-montana-silenciosa";
const PAGE_TITLE =
  "Pólipos de colon: una señal importante que muchas veces no da síntomas | Veramed";
const PAGE_DESCRIPTION =
  "Qué son los pólipos de colon, cómo se detectan, cómo se tratan y por qué el seguimiento con colonoscopía ayuda a prevenir cáncer colorrectal.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    "pólipos de colon",
    "síntomas de pólipos de colon",
    "colonoscopía",
    "cáncer de colon",
    "cáncer colorrectal",
    "examen de colon",
    "sangre en deposiciones",
    "prevención cáncer de colon",
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
        url: "/brand/blog-polyps.png",
        width: 1366,
        height: 768,
        alt: "Pólipos de colon y prevención de cáncer colorrectal",
      },
    ],
  },
};

export default function ColonPolypsArticlePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Screening cáncer
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Pólipos de colon: una señal importante que muchas veces no da síntomas
          </h1>
          <p className="mt-4 text-sm text-slate-500">27 marzo 2026</p>

          <div className="mt-8 space-y-6 text-sm leading-8 text-slate-700">
            <p>
              Los pólipos de colon son más comunes de lo que muchas personas creen. De hecho, una
              gran parte de los adultos puede tenerlos sin saberlo, porque la mayoría no produce
              molestias ni síntomas.
            </p>
            <p>
              El problema es que algunos pólipos, con el tiempo, pueden transformarse en cáncer de
              colon. Por eso es tan importante detectarlos a tiempo y, cuando corresponde, sacarlos.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <Image
              src="/brand/blog-polyps.png"
              alt="Pólipos de colon y su detección precoz"
              width={1366}
              height={768}
              className="h-auto w-full"
              priority
            />
          </div>

          <div className="mt-8 space-y-6 text-sm leading-8 text-slate-700">
            <section>
              <h2 className="text-xl font-semibold text-slate-950">¿Qué son los pólipos de colon?</h2>
              <p className="mt-3">
                Son pequeños crecimientos que aparecen en la capa interna del colon, o sea, del
                intestino grueso.
              </p>
              <p className="mt-3">
                Muchos pólipos son benignos y nunca causan problemas. Pero otros sí pueden ir
                cambiando con los años. Por eso, cuando se encuentran, el equipo médico suele
                evaluarlos con atención y muchas veces decide retirarlos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">¿Cómo saber si tengo pólipos?</h2>
              <p className="mt-3">La mayoría de las veces, no se sienten.</p>
              <p className="mt-3">
                No suelen causar dolor, fiebre ni síntomas digestivos claros. Y justamente por eso
                muchas personas los descubren solo cuando se hacen un examen preventivo, como una
                colonoscopía.
              </p>
              <p className="mt-3">En otras palabras: puedes sentirte bien y aun así tener pólipos.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">¿Cómo se detectan?</h2>
              <p className="mt-3">
                La forma más habitual de encontrarlos es con exámenes de pesquisa de cáncer
                colorrectal.
              </p>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">Colonoscopía</h3>
              <p className="mt-2">
                Es el examen más importante para esto. Permite mirar el colon por dentro con una
                cámara y, además, sacar los pólipos en el mismo procedimiento si aparecen.
              </p>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">Test de deposiciones</h3>
              <p className="mt-2">
                Algunos exámenes buscan sangre oculta o cambios anormales en una muestra de
                deposiciones. Si el resultado sale alterado, normalmente el siguiente paso es una
                colonoscopía.
              </p>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                Colonografía por scanner
              </h3>
              <p className="mt-2">
                También llamada “colonoscopía virtual”. Puede mostrar imágenes del colon, pero si
                aparece algo sospechoso, igual se necesita una colonoscopía tradicional para
                confirmar y tratar.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                ¿Qué pasa si me encuentran un pólipo?
              </h2>
              <p className="mt-3">
                En muchos casos, el pólipo se puede sacar durante la misma colonoscopía.
              </p>
              <p className="mt-3">
                Después se envía a estudio para saber qué tipo de pólipo era y si tenía cambios que
                pudieran transformarse en cáncer. Ese resultado es clave porque define si necesitas
                controles más seguidos en el futuro.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                ¿Después hay que seguir controlándose?
              </h2>
              <p className="mt-3">Muchas veces, sí.</p>
              <p className="mt-3">
                Dependiendo del tipo, tamaño y número de pólipos, tu médico puede recomendar
                repetir la colonoscopía después de algunos años. La idea es detectar nuevas lesiones
                antes de que se transformen en un problema mayor.
              </p>
              <p className="mt-3">
                En algunos casos, si hay antecedentes familiares importantes o muchos pólipos,
                también podría considerarse un estudio genético.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">¿Se pueden prevenir?</h2>
              <p className="mt-3">No siempre al 100%, pero sí se puede bajar el riesgo.</p>
              <p className="mt-3">
                Hay hábitos que ayudan a prevenir pólipos de colon y también a reducir el riesgo de
                cáncer colorrectal:
              </p>
              <ul className="mt-3 space-y-1 pl-5">
                <li>comer más frutas, verduras y fibra</li>
                <li>evitar el exceso de alcohol</li>
                <li>no fumar</li>
                <li>mantener un peso saludable</li>
                <li>hacerse controles preventivos cuando corresponde</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">Lo más importante</h2>
              <p className="mt-3">
                Los pólipos de colon muchas veces son silenciosos, pero eso no significa que haya
                que ignorarlos. Encontrarlos a tiempo permite actuar antes de que aparezcan
                complicaciones.
              </p>
              <p className="mt-3">
                La buena noticia es que hoy existen exámenes que no solo ayudan a detectarlos, sino
                también a tratarlos de forma precoz.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">En simple</h2>
              <p className="mt-3">
                Si te hablaron de pólipos de colon, no significa automáticamente algo grave. Pero sí
                vale la pena estudiarlos bien.
              </p>
              <p className="mt-3">
                Porque en salud, muchas veces lo más importante no es esperar a sentirse mal, sino
                llegar antes.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
