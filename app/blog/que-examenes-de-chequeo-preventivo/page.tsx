import Link from "next/link";

export default function PreventiveCheckupArticlePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Prevención
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            ¿Qué exámenes de chequeo preventivo vale la pena hacerse?
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            Una guía simple para entender qué se solicita por edad, sexo y factores de riesgo, y
            por qué no existe un panel único para todas las personas.
          </p>
          <p className="mt-4 text-sm text-slate-500">04 marzo 2026</p>

          <div className="mt-8 space-y-6 text-sm leading-8 text-slate-700">
            <p>
              Muchas personas buscan hacerse un “chequeo completo” una vez al año. La idea parece
              lógica: mientras más exámenes, mejor prevención. Sin embargo, en medicina preventiva
              la evidencia muestra algo distinto. No todos los exámenes sirven para todas las
              personas, y pedir estudios innecesarios puede generar falsos positivos, preocupación
              injustificada e incluso procedimientos que no se necesitaban.
            </p>
            <p>
              La clave de la prevención no es hacerse muchos exámenes, sino los exámenes correctos
              según tu perfil de riesgo.
            </p>
            <p>
              En esta guía revisamos qué chequeos realmente tienen respaldo científico, cómo
              cambian según edad y sexo, y por qué no existe un panel universal válido para todos.
            </p>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                La lógica detrás de los chequeos preventivos
              </h2>
              <p className="mt-3">
                Los exámenes preventivos buscan detectar enfermedades antes de que den síntomas,
                cuando todavía es posible intervenir y cambiar el pronóstico.
              </p>
              <p className="mt-3">
                Pero para que un examen sea útil como tamizaje debe cumplir varias condiciones:
              </p>
              <ul className="mt-3 space-y-1 pl-5">
                <li>La enfermedad debe ser relativamente frecuente.</li>
                <li>Debe existir un tratamiento eficaz si se detecta temprano.</li>
                <li>El examen debe ser confiable y seguro.</li>
                <li>Detectar la enfermedad antes debe mejorar los resultados.</li>
              </ul>
              <p className="mt-3">
                Muchos exámenes populares no cumplen estos criterios, por lo que no se recomiendan
                de forma rutinaria en personas sanas.
              </p>
              <p className="mt-3">
                Por eso las guías médicas internacionales insisten en personalizar los chequeos
                según edad, sexo y factores de riesgo.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                Exámenes preventivos que suelen recomendarse en adultos
              </h2>
              <p className="mt-3">
                Aunque cada caso es distinto, existen algunos controles que con frecuencia se
                indican en adultos aparentemente sanos.
              </p>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">Presión arterial</h3>
              <p className="mt-2">
                Es uno de los chequeos más importantes. La hipertensión es muy frecuente y suele
                ser silenciosa durante años. Detectarla a tiempo permite reducir significativamente
                el riesgo de infarto, accidente cerebrovascular y enfermedad renal.
              </p>
              <p className="mt-2">
                Por eso se recomienda controlar la presión al menos una vez al año en adultos.
              </p>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                Perfil lipídico (colesterol)
              </h3>
              <p className="mt-2">
                Mide colesterol total, LDL, HDL y triglicéridos. Sirve para estimar el riesgo
                cardiovascular y decidir si es necesario hacer cambios en el estilo de vida o
                iniciar tratamiento.
              </p>
              <p className="mt-2">
                En personas sin factores de riesgo, suele solicitarse cada ciertos años desde la
                adultez. Si existen antecedentes familiares, obesidad, diabetes o tabaquismo, el
                control suele ser más frecuente.
              </p>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                Glicemia o exámenes para diabetes
              </h3>
              <p className="mt-2">
                La diabetes tipo 2 puede desarrollarse durante años sin síntomas. El tamizaje
                suele realizarse con glicemia en ayunas o hemoglobina glicada, especialmente en
                personas con factores de riesgo.
              </p>
              <ul className="mt-2 space-y-1 pl-5">
                <li>sobrepeso u obesidad</li>
                <li>antecedentes familiares</li>
                <li>hipertensión</li>
                <li>síndrome metabólico</li>
              </ul>
              <p className="mt-2">
                Detectar la diabetes temprano permite iniciar cambios de estilo de vida y
                tratamiento oportuno.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                Tamizaje de cáncer: cuándo vale la pena
              </h2>
              <p className="mt-3">
                Algunos cánceres tienen programas de detección precoz que han demostrado reducir
                mortalidad.
              </p>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">Cáncer cervicouterino</h3>
              <p className="mt-2">Se detecta mediante Papanicolaou y test de HPV.</p>
              <p className="mt-2">
                Estos exámenes han logrado reducir de forma importante la mortalidad por cáncer
                cervicouterino en muchos países.
              </p>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">Cáncer de mama</h3>
              <p className="mt-2">
                La mamografía es el principal método de detección. La edad de inicio puede variar
                según las guías y los factores de riesgo individuales.
              </p>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">Cáncer colorrectal</h3>
              <p className="mt-2">
                Es uno de los cánceres más frecuentes en adultos. El tamizaje puede realizarse con
                test de sangre oculta en deposiciones, colonoscopía o test inmunológico fecal.
              </p>
              <p className="mt-2">
                En personas con familiares afectados, el inicio del tamizaje suele adelantarse.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                Cuando los antecedentes familiares cambian las reglas
              </h2>
              <p className="mt-3">
                La historia familiar puede modificar significativamente las recomendaciones.
              </p>
              <ul className="mt-3 space-y-1 pl-5">
                <li>
                  Si un familiar directo tuvo cáncer colorrectal a edad temprana, el tamizaje
                  suele comenzar antes.
                </li>
                <li>
                  Ante antecedentes familiares de cáncer de mama, puede recomendarse iniciar
                  controles antes o utilizar métodos adicionales.
                </li>
                <li>
                  Algunas enfermedades cardiovasculares precoces también cambian el enfoque del
                  chequeo.
                </li>
              </ul>
              <p className="mt-3">
                Por eso un buen chequeo preventivo siempre parte con una evaluación clínica y de
                antecedentes, no con un listado fijo de exámenes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                Exámenes que muchas personas piden, pero no siempre son necesarios
              </h2>
              <p className="mt-3">
                Algunos estudios se solicitan con frecuencia pese a que no se recomiendan como
                tamizaje en personas sanas.
              </p>
              <ul className="mt-3 space-y-1 pl-5">
                <li>paneles extensos de vitaminas</li>
                <li>marcadores tumorales</li>
                <li>ecografías de múltiples órganos sin síntomas</li>
                <li>tomografías de cuerpo completo</li>
              </ul>
              <p className="mt-3">
                Estos exámenes pueden detectar hallazgos incidentales que no tienen relevancia
                clínica pero que generan nuevos estudios, costos y ansiedad.
              </p>
              <p className="mt-3">
                En medicina preventiva se busca maximizar beneficios y minimizar daño, por lo que
                pedir más exámenes no siempre significa mejor medicina.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                Entonces, ¿qué chequeo vale la pena hacerse?
              </h2>
              <p className="mt-3">
                La mejor estrategia preventiva combina tres elementos:
              </p>
              <ol className="mt-3 space-y-1 pl-5">
                <li>Evaluación de riesgo individual.</li>
                <li>Exámenes con evidencia científica.</li>
                <li>Revisión periódica según edad y antecedentes.</li>
              </ol>
              <p className="mt-3">
                No existe un “chequeo universal”, porque las necesidades cambian a lo largo de la
                vida.
              </p>
              <p className="mt-3">
                Una persona joven sin factores de riesgo probablemente necesitará pocos exámenes.
                En cambio, alguien con antecedentes familiares o factores de riesgo cardiovascular
                puede requerir controles más específicos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-950">
                La prevención no depende solo de exámenes
              </h2>
              <p className="mt-3">
                Los exámenes son solo una parte del cuidado preventivo. Gran parte del riesgo de
                enfermedad se relaciona con factores modificables.
              </p>
              <ul className="mt-3 space-y-1 pl-5">
                <li>actividad física</li>
                <li>alimentación</li>
                <li>tabaquismo</li>
                <li>consumo de alcohol</li>
                <li>calidad del sueño</li>
              </ul>
              <p className="mt-3">
                Por eso muchas veces las intervenciones más efectivas no están en un laboratorio,
                sino en cambios sostenidos en el estilo de vida.
              </p>
              <p className="mt-3">
                La prevención efectiva no se trata de hacerse todo, sino de hacer lo que realmente
                aporta valor según tu perfil de riesgo.
              </p>
              <p className="mt-3">
                Entender qué exámenes valen la pena y cuándo realizarlos permite tomar decisiones
                informadas y evitar estudios innecesarios.
              </p>
              <p className="mt-3 font-medium text-slate-900">
                Porque en salud preventiva, la personalización importa más que la cantidad de
                exámenes.
              </p>
            </section>
          </div>

          <div className="mt-10">
            <Link
              href="/blog"
              className="inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Volver al blog
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
