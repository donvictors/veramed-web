import type { Metadata } from "next";
import Image from "next/image";

const PAGE_URL = "https://www.veramed.cl/blog/examenes-chequeo-preventivo";
const PAGE_TITLE = "Chequeo preventivo: qué exámenes hacerte según tú edad | Veramed";
const PAGE_DESCRIPTION =
  "Chequeo preventivo en adultos: exámenes según edad y riesgo para detectar enfermedades a tiempo y evitar estudios innecesarios basados en evidencia.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    "chequeo preventivo",
    "chequeo médico",
    "exámenes preventivos",
    "exámenes de rutina adulto",
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
        url: "/brand/voxel-check_up.png",
        width: 1366,
        height: 768,
        alt: "Chequeo preventivo en adultos",
      },
    ],
  },
};

export default function PreventiveCheckupArticlePage() {
  const medicalWebPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: "Chequeo preventivo: qué exámenes hacerte según tú edad",
    headline: "Chequeo preventivo: qué exámenes hacerte según tú edad",
    description: PAGE_DESCRIPTION,
    inLanguage: "es-CL",
    url: PAGE_URL,
    datePublished: "2026-03-04",
    dateModified: "2026-03-09",
    about: [
      "chequeo preventivo",
      "chequeo médico",
      "exámenes preventivos",
      "exámenes de rutina adulto",
    ],
    publisher: {
      "@type": "Organization",
      name: "Veramed",
      url: "https://www.veramed.cl",
    },
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalWebPageJsonLd) }}
        />
        <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Prevención
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Chequeo preventivo: qué exámenes hacerte según tú edad
          </h1>
          <p className="mt-4 text-sm text-slate-500">04 marzo 2026</p>

          <div className="mt-8 space-y-6 text-sm leading-8 text-slate-700">
            <p>
              Muchas personas quieren hacerse un chequeo médico preventivo una vez al año. La idea
              parece lógica: mientras más exámenes, mejor prevención. Sin embargo, la evidencia
              médica muestra algo distinto.
            </p>
            <p>
              En medicina preventiva, lo importante no es hacerse muchos exámenes, sino hacerse los
              exámenes correctos según la edad, el sexo y los factores de riesgo personales.
            </p>
            <p>
              Un buen chequeo preventivo busca detectar enfermedades antes de que produzcan
              síntomas, cuando aún es posible intervenir y mejorar el pronóstico.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <Image
              src="/brand/voxel-check_up.png"
              alt="Chequeo preventivo en contexto clínico"
              width={1366}
              height={768}
              className="h-auto w-full"
              priority
            />
          </div>

          <div className="mt-8 space-y-6 text-sm leading-8 text-slate-700">
            <section>
              <h2 className="text-xl font-semibold text-slate-950">Qué es un chequeo preventivo</h2>
              <p className="mt-3">
                Un chequeo preventivo consiste en realizar evaluaciones clínicas o exámenes de
                laboratorio para detectar enfermedades en etapas tempranas.
              </p>
              <p className="mt-3">
                Para que un examen sea útil como tamizaje debe cumplir algunas condiciones:
              </p>
              <ul className="mt-3 space-y-1 pl-5">
                <li>La enfermedad debe ser relativamente frecuente.</li>
                <li>Debe existir tratamiento eficaz si se detecta temprano.</li>
                <li>El examen debe ser confiable y seguro.</li>
                <li>Detectar la enfermedad antes debe mejorar el resultado.</li>
              </ul>
              <p className="mt-3">Por eso no todos los exámenes sirven como chequeo en personas sanas.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                Exámenes de chequeo preventivo recomendados en adultos
              </h2>
              <p className="mt-3">
                Aunque las recomendaciones pueden variar según cada persona, algunos controles
                suelen formar parte de un chequeo médico preventivo.
              </p>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">Control de presión arterial</h3>
              <p className="mt-2">
                La hipertensión es una enfermedad frecuente y muchas veces no produce síntomas.
                Detectarla a tiempo reduce el riesgo de infarto, accidente cerebrovascular y
                enfermedad renal.
              </p>
              <p className="mt-2">Por eso se recomienda controlar la presión al menos una vez al año.</p>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">Perfil lipídico (colesterol)</h3>
              <p className="mt-2">
                El perfil lipídico mide colesterol total, LDL, HDL y triglicéridos. Este examen
                permite estimar el riesgo cardiovascular y orientar medidas de prevención.
              </p>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                Exámenes para detectar diabetes
              </h3>
              <p className="mt-2">
                La diabetes tipo 2 puede desarrollarse durante años sin síntomas. El tamizaje suele
                realizarse con:
              </p>
              <ul className="mt-2 space-y-1 pl-5">
                <li>glicemia en ayunas</li>
                <li>hemoglobina glicada</li>
              </ul>
              <p className="mt-2">
                Se recomienda especialmente en personas con sobrepeso, antecedentes familiares o
                hipertensión.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                Tamizaje de cáncer que ha demostrado beneficio
              </h2>
              <p className="mt-3">
                Algunos cánceres tienen programas de detección precoz que han demostrado reducir la
                mortalidad.
              </p>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">Cáncer cervicouterino</h3>
              <p className="mt-2">Se detecta mediante Papanicolaou y test de HPV.</p>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">Cáncer de mama</h3>
              <p className="mt-2">La mamografía es el principal método de detección.</p>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">Cáncer colorrectal</h3>
              <p className="mt-2">
                Puede detectarse con test de sangre oculta en deposiciones o colonoscopía.
              </p>
              <p className="mt-2">
                En personas con antecedentes familiares, el tamizaje suele comenzar a una edad más
                temprana.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                Exámenes que no siempre se recomiendan como chequeo
              </h2>
              <p className="mt-3">
                Algunos estudios se solicitan con frecuencia pese a que no se recomiendan como
                tamizaje en personas sanas:
              </p>
              <ul className="mt-3 space-y-1 pl-5">
                <li>marcadores tumorales</li>
                <li>paneles extensos de vitaminas</li>
                <li>ecografías de múltiples órganos sin síntomas</li>
                <li>tomografías de cuerpo completo</li>
              </ul>
              <p className="mt-3">
                Estos exámenes pueden detectar hallazgos sin relevancia clínica que terminan
                generando más estudios y preocupación innecesaria.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                Entonces, ¿qué chequeo vale la pena hacerse?
              </h2>
              <p className="mt-3">La mejor estrategia preventiva combina tres elementos:</p>
              <ul className="mt-3 space-y-1 pl-5">
                <li>evaluación del riesgo individual</li>
                <li>exámenes con respaldo científico</li>
                <li>controles periódicos según edad y antecedentes</li>
              </ul>
              <p className="mt-3">
                En medicina preventiva no existe un chequeo universal para todas las personas.
              </p>
              <p className="mt-3">
                La prevención efectiva no se trata de hacerse todos los exámenes posibles, sino de
                realizar los controles adecuados según tu perfil de riesgo.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
