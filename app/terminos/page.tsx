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
        <div className="mt-6 space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700">
          <p>
            Bienvenido a Veramed. Estos términos y condiciones (“Términos”) regulan tu acceso y
            uso de la plataforma digital disponible en{" "}
            <a
              href="https://veramed.cl"
              className="font-semibold text-slate-950 underline"
              target="_blank"
              rel="noreferrer"
            >
              https://veramed.cl
            </a>{" "}
            (“Sitio”), así como cualquier servicio que Veramed ofrece a través de éste.
          </p>
          <p>
            Al usar el Sitio o solicitar servicios, aceptas estos Términos en su totalidad. Si no
            estás de acuerdo con alguno de ellos, no debes utilizar el Sitio ni los servicios
            ofrecidos.
          </p>
          <p>
            Estos Términos complementan y en ningún caso reemplazan la legislación aplicable ni las
            condiciones legales específicas establecidas por proveedores de servicios de salud u
            otras entidades.
          </p>

          <section>
            <h2 className="text-base font-semibold text-slate-950">1. Definiciones</h2>
            <div className="mt-3 space-y-3">
              <p>
                <span className="font-semibold text-slate-950">Veramed:</span> Nombre comercial de
                la empresa responsable del Sitio y de los servicios aquí descritos.
              </p>
              <p>
                <span className="font-semibold text-slate-950">Usuario / Cliente:</span> Persona
                física mayor de edad que accede o utiliza el Sitio o servicios.
              </p>
              <p>
                <span className="font-semibold text-slate-950">Servicios:</span> Todos los
                productos o funcionalidades ofrecidos en o a través del Sitio, incluyendo paneles
                de recomendaciones, generación de órdenes médicas, validación médica, formularios
                de síntomas, contenido, funcionalidades de usuario, etc.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              2. Naturaleza de los Servicios
            </h2>
            <div className="mt-3 space-y-3">
              <p>
                <span className="font-semibold text-slate-950">a) Servicio asistido:</span> Los
                servicios que Veramed ofrece no constituyen una consulta médica completa,
                diagnóstico o tratamiento. La finalidad del Sitio es generar órdenes para la
                evaluación inicial de un paciente basadas en información proporcionada por el
                Usuario y revisadas por un profesional debidamente habilitado. La interpretación y
                posterior seguimiento de estos resultados debe hacerse con un profesional de salud
                capacitado, lo que es de completa responsabilidad del Usuario.
              </p>
              <p>
                <span className="font-semibold text-slate-950">b) Validación médica:</span> Todas
                las órdenes médicas que se emitan son previamente revisadas y autorizadas por un
                médico con título vigente en Chile e inscripción en la Superintendencia de Salud.
                Este proceso está sujeto a disponibilidad del personal médico y puede demorar hasta
                12 horas hábiles, sobretodo en las órdenes solicitadas con motivo de síntomas.
              </p>
              <p>
                <span className="font-semibold text-slate-950">c) Orden médica:</span> El
                documento generado por Veramed y entregado al Usuario es una orden médica digital
                que puede imprimirse o descargarse y presentar para realización de exámenes en
                laboratorios o centros de diagnóstico autorizados.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">3. Condiciones de Uso</h2>
            <div className="mt-3 space-y-3">
              <p>
                <span className="font-semibold text-slate-950">a) Edad mínima:</span> El uso del
                Sitio y prestación de servicios está limitado a personas mayores de edad según la
                legislación chilena vigente al momento de uso. Si el Usuario es menor de edad, debe
                contar con la autorización de su representante legal.
              </p>
              <p>
                <span className="font-semibold text-slate-950">b) Veracidad:</span> El Usuario
                garantiza que toda la información proporcionada a través del Sitio es completa,
                exacta y verídica. La entrega de información inexacta o fraudulenta puede invalidar
                la orden médica y libera a Veramed de cualquier responsabilidad por el uso que
                devenga de esta.
              </p>
              <p>
                <span className="font-semibold text-slate-950">c) Uso adecuado:</span> El Usuario
                se compromete a utilizar el Sitio y los servicios de buena fe y de forma compatible
                con la finalidad prevista por Veramed, respetando todas las leyes aplicables.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              4. Ámbito Clínico y Limitaciones
            </h2>
            <div className="mt-3 space-y-3">
              <p>
                <span className="font-semibold text-slate-950">
                  a) No es una consulta médica integral:
                </span>{" "}
                Los resultados, recomendaciones, órdenes o contenido generado por Veramed no
                sustituyen una evaluación clínica presencial o remota especializada.
              </p>
              <p>
                <span className="font-semibold text-slate-950">
                  b) No en situaciones de urgencia:
                </span>{" "}
                En caso de síntomas graves, urgencia médica o situaciones que impliquen riesgo
                inmediato para la salud, el Usuario debe buscar atención médica de emergencia.
              </p>
              <p>
                <span className="font-semibold text-slate-950">
                  c) Resultados de exámenes y seguimiento:
                </span>{" "}
                La obtención de exámenes médicos y sus resultados dependen de procesos externos a
                Veramed (centros de diagnóstico, laboratorios, fechas de toma, institución de
                salud, etc.). Veramed no controla ni garantiza dichos procesos.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">5. Gastos y Pago</h2>
            <div className="mt-3 space-y-3">
              <p>
                <span className="font-semibold text-slate-950">a)</span> El uso del Sitio puede
                requerir el pago de determinadas tarifas por la emisión de órdenes médicas o por
                servicios adicionales.
              </p>
              <p>
                <span className="font-semibold text-slate-950">b)</span> Los pagos se realizarán
                con los medios disponibles en el Sitio (WebPay, MercadoPago, tarjetas de crédito,
                etc.), según las condiciones y formas publicadas.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              6. Propiedad Intelectual
            </h2>
            <div className="mt-3 space-y-3">
              <p>
                <span className="font-semibold text-slate-950">a)</span> Todos los contenidos del
                Sitio -incluyendo textos, imágenes, diseños, logos, iconografía, software, código
                fuente, base de datos, materiales gráficos, etc.- son titularidad de Veramed o de
                terceros que han autorizado explícitamente su uso.
              </p>
              <p>
                <span className="font-semibold text-slate-950">b)</span> Queda prohibida la
                reproducción, distribución, modificación, transmisión o explotación total o parcial
                del Sitio o sus contenidos, sin autorización expresa de Veramed o de su
                representante legal.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              7. Privacidad y Datos Personales
            </h2>
            <div className="mt-3 space-y-3">
              <p>
                <span className="font-semibold text-slate-950">a)</span> El tratamiento de datos
                personales que realice Veramed está regulado por la Política de Privacidad,
                disponible en{" "}
                <a
                  href="https://veramed.cl/privacidad"
                  className="font-semibold text-slate-950 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  https://veramed.cl/privacidad
                </a>
                , la cual se entiende incorporada a estos Términos.
              </p>
              <p>
                <span className="font-semibold text-slate-950">b)</span> Al utilizar el Sitio,
                otorgas consentimiento para el tratamiento de tus datos personales conforme a la
                Política de Privacidad y a la legislación aplicable en Chile sobre protección de
                datos.
              </p>
              <p>
                <span className="font-semibold text-slate-950">c)</span> Veramed adopta medidas de
                seguridad adecuadas para proteger los datos, pero no garantiza la imposibilidad de
                accesos no autorizados, ataques o vulneraciones de seguridad más allá de su control
                razonable.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              8. Confidencialidad y Mensajería
            </h2>
            <div className="mt-3 space-y-3">
              <p>
                <span className="font-semibold text-slate-950">a)</span> Cualquier comunicación
                entre el Usuario y Veramed, o entre Veramed y terceros que participen en la
                prestación del servicio (incluyendo profesionales médico-validadores), se entiende
                como información que puede estar sujeta a confidencialidad profesional y a normas de
                secreto profesional según la legislación aplicable.
              </p>
              <p>
                <span className="font-semibold text-slate-950">b)</span> Veramed no será
                responsable por la divulgación de información personal fuera de sus sistemas por
                causas ajenas a su control o por fallas de terceros proveedores.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              9. Limitación de Responsabilidad
            </h2>
            <div className="mt-3 space-y-3">
              <p>
                <span className="font-semibold text-slate-950">a)</span> Veramed no será
                responsable por:
              </p>
              <div className="space-y-2 pl-4">
                <p>Daños indirectos, incidentales, especiales o consecuentes que se deriven del acceso o uso del Sitio.</p>
                <p>Decisiones clínicas tomadas por el Usuario basadas exclusivamente en la información del Sitio.</p>
                <p>Errores de terceros en la toma de muestras, análisis, resultados o interpretación de exámenes.</p>
              </div>
              <p>
                <span className="font-semibold text-slate-950">b)</span> En ningún caso la
                responsabilidad total de Veramed excederá el monto efectivamente pagado por el
                Usuario por el servicio cuestionado.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              10. Vigencia y Modificaciones
            </h2>
            <div className="mt-3 space-y-3">
              <p>
                <span className="font-semibold text-slate-950">a)</span> Veramed puede modificar
                estos Términos en cualquier momento mediante la publicación en el Sitio.
              </p>
              <p>
                <span className="font-semibold text-slate-950">b)</span> La continuación en el uso
                del Sitio después de la publicación de cambios implica la aceptación de los nuevos
                términos.
              </p>
              <p>
                <span className="font-semibold text-slate-950">c)</span> Es responsabilidad del
                Usuario revisar los Términos periódicamente.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              11. Legislación y Jurisdicción
            </h2>
            <p className="mt-3">
              Estos Términos se interpretan y rigen conforme a las leyes de la República de Chile.
              Para cualquier controversia derivada de estos Términos, las partes se someten a los
              tribunales ordinarios de justicia de Santiago, Chile, con renuncia a cualquier otro
              fuero o jurisdicción.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">12. Contacto</h2>
            <p className="mt-3">
              Si tienes dudas, quejas o necesitas aclaraciones sobre estos Términos, puedes
              contactarnos a través del correo electrónico{" "}
              <a
                href="mailto:contacto@veramed.cl"
                className="font-semibold text-slate-950 underline"
              >
                contacto@veramed.cl
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">Firma</h2>
            <p className="mt-3">
              Al utilizar Veramed, aceptas que has leído, entendido y estás de acuerdo con estos
              Términos y Condiciones.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
