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
        <div className="mt-6 space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700">
          <p>
            En Veramed SpA (en adelante, “Veramed” o “nosotros”), nos comprometemos a proteger la
            privacidad de tus datos personales.
          </p>
          <p>
            La presente Política de Privacidad describe cómo recopilamos, usamos, almacenamos,
            protegemos y tratamos tu información cuando accedes o utilizas el sitio web{" "}
            <a
              href="https://veramed.cl"
              className="font-semibold text-slate-950 underline"
              target="_blank"
              rel="noreferrer"
            >
              https://veramed.cl
            </a>{" "}
            (el “Sitio”), y cualquier servicio asociado.
          </p>
          <p>
            Al utilizar el Sitio y nuestros servicios, aceptas las prácticas descritas en esta
            Política.
          </p>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              1. RESPONSABLE DEL TRATAMIENTO
            </h2>
            <div className="mt-3 space-y-2">
              <p>El responsable del tratamiento de tus datos personales es:</p>
              <p className="font-medium text-slate-950">Veramed SpA</p>
              <p>
                Correo:{" "}
                <a
                  href="mailto:contacto@veramed.cl"
                  className="font-semibold text-slate-950 underline"
                >
                  contacto@veramed.cl
                </a>
              </p>
              <p>Dirección: Santiago, Chile</p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              2. ¿QUÉ DATOS RECOPILAMOS?
            </h2>
            <div className="mt-3 space-y-5">
              <div>
                <p className="font-semibold text-slate-950">🔹 Datos de identificación</p>
                <div className="mt-2 space-y-1 pl-4">
                  <p>Nombre completo</p>
                  <p>Correo electrónico</p>
                  <p>Teléfono (si lo proporcionas)</p>
                  <p>Edad / Fecha de nacimiento</p>
                </div>
              </div>
              <div>
                <p className="font-semibold text-slate-950">
                  🔹 Datos clínicos y de salud (datos sensibles)
                </p>
                <p className="mt-2">
                  Estos datos son voluntarios y necesarios solo para prestar el servicio específico
                  del Sitio:
                </p>
                <div className="mt-2 space-y-1 pl-4">
                  <p>Síntomas declarados</p>
                  <p>Antecedentes médicos</p>
                  <p>Información relevante para la generación de órdenes médicas</p>
                  <p>
                    Factores de riesgo clínico (como tabaco, embarazo, actividad sexual)
                  </p>
                </div>
              </div>
              <div>
                <p className="font-semibold text-slate-950">🔹 Datos técnicos</p>
                <div className="mt-2 space-y-1 pl-4">
                  <p>Dirección IP</p>
                  <p>Datos de dispositivo y navegador</p>
                  <p>Cookies / datos de uso para estadísticas y mejoras</p>
                </div>
              </div>
              <div>
                <p className="font-semibold text-slate-950">🔹 Datos de pago</p>
                <p className="mt-2">
                  Procesados por proveedores externos (por ejemplo, WebPay o MercadoPago). Veramed
                  no almacena números completos de tarjetas bancarias ni datos sensibles de pago.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              3. ¿PARA QUÉ USAMOS TUS DATOS?
            </h2>
            <div className="mt-3 space-y-2">
              <p>Tratamos tus datos personales para las siguientes finalidades:</p>
              <div className="space-y-1 pl-4">
                <p>🔹 Generar recomendaciones de exámenes basadas en guías clínicas.</p>
                <p>🔹 Permitir la revisión y validación médica de órdenes.</p>
                <p>🔹 Emitir órdenes médicas digitales válidas.</p>
                <p>🔹 Gestionar pagos y transacciones.</p>
                <p>🔹 Enviar notificaciones relacionadas al servicio (correo).</p>
                <p>🔹 Mejorar nuestra plataforma y experiencia de usuario.</p>
                <p>🔹 Cumplir con obligaciones legales.</p>
                <p>🔹 Prevenir fraudes o usos indebidos.</p>
              </div>
              <p>
                Importante: Los datos de salud solo se usan para fines asociados a los servicios de
                Veramed y se tratan con especial cuidado conforme a las leyes chilenas.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              4. BASE LEGAL PARA EL TRATAMIENTO
            </h2>
            <div className="mt-3 space-y-2">
              <p>El tratamiento de tus datos personales se basa en:</p>
              <div className="space-y-1 pl-4">
                <p>📌 Tu consentimiento explícito al utilizar el Sitio.</p>
                <p>📌 La ejecución de un servicio que tú solicitaste.</p>
                <p>📌 El cumplimiento de obligaciones legales.</p>
                <p>📌 El interés legítimo de mantener y proteger la plataforma.</p>
              </div>
              <p>
                En el caso de datos sensibles de salud, se requiere tu consentimiento explícito
                para su tratamiento y uso.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              5. CÓMO PROTEGEMOS TU INFORMACIÓN
            </h2>
            <div className="mt-3 space-y-3">
              <p>
                Implementamos medidas técnicas y administrativas razonables para proteger tus datos
                contra:
              </p>
              <div className="space-y-1 pl-4">
                <p>✔ Accesos no autorizados</p>
                <p>✔ Pérdida</p>
                <p>✔ Alteración</p>
                <p>✔ Divulgación</p>
                <p>✔ Uso indebido</p>
              </div>
              <p>Entre esas medidas se incluyen:</p>
              <div className="space-y-1 pl-4">
                <p>Servidores seguros con cifrado (HTTPS)</p>
                <p>Control de acceso restringido</p>
                <p>Protocolos internos de seguridad</p>
                <p>Monitoreo y auditoría</p>
              </div>
              <p>
                Sin embargo, ningún sistema es completamente inviolable, y no podemos garantizar
                seguridad absoluta frente a factores externos fuera de nuestro control.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              6. USO DE COOKIES Y TECNOLOGÍA SIMILAR
            </h2>
            <div className="mt-3 space-y-3">
              <p>El Sitio puede usar cookies u otras tecnologías para:</p>
              <div className="space-y-1 pl-4">
                <p>✔ Analizar tráfico y uso del Sitio</p>
                <p>✔ Recordar preferencias del usuario</p>
                <p>✔ Mejorar la experiencia de navegación</p>
              </div>
              <p>
                Puedes configurar tu navegador para bloquear cookies, aunque esto puede afectar
                algunas funciones del Sitio.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              7. ¿COMPARTIMOS TUS DATOS CON TERCEROS?
            </h2>
            <div className="mt-3 space-y-3">
              <p>Los datos pueden ser compartidos cuando sea necesario para:</p>
              <div className="space-y-1 pl-4">
                <p>🔹 Validación médica por profesionales habilitados.</p>
                <p>🔹 Procesar pagos a través de proveedores externos.</p>
                <p>🔹 Cumplir requerimientos legales o judiciales.</p>
                <p>🔹 Proveedores tecnológicos que soportan el Sitio (p.ej., hosting).</p>
              </div>
              <p>
                No vendemos ni comercializamos tu información personal a terceros con fines de
                lucro.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              8. TRANSFERENCIA INTERNACIONAL DE DATOS
            </h2>
            <p className="mt-3">
              Datos personales pueden ser almacenados o procesados en servidores ubicados fuera de
              Chile (por ejemplo, servicios en la nube). Cuando esto ocurra, se hará con las
              medidas de seguridad exigidas por la legislación aplicable y solo cuando el país
              destino tenga estándares adecuados de protección de datos.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              9. TIEMPO DE RETENCIÓN DE DATOS
            </h2>
            <div className="mt-3 space-y-3">
              <p>Tus datos personales serán retenidos mientras sea necesario para:</p>
              <div className="space-y-1 pl-4">
                <p>✔ Proveer el servicio solicitado.</p>
                <p>✔ Cumplir obligaciones legales.</p>
                <p>✔ Garantizar historial clínico asociado a órdenes médicas si corresponde.</p>
              </div>
              <p>
                Después de estos plazos, tus datos pueden ser eliminados o anonimizados de forma
                segura.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              10. TUS DERECHOS COMO TITULAR DE DATOS
            </h2>
            <div className="mt-3 space-y-3">
              <p>
                Bajo la legislación chilena (Ley Nº 19.628 sobre Protección de la Vida Privada),
                tienes derecho a:
              </p>
              <div className="space-y-1 pl-4">
                <p>🔹 Acceder a tus datos que poseemos.</p>
                <p>🔹 Solicitar su corrección si son inexactos.</p>
                <p>🔹 Solicitar su eliminación cuando proceda.</p>
                <p>🔹 Oponerte al tratamiento cuando aplique.</p>
              </div>
              <p>
                Puedes ejercer estos derechos enviando un correo a:{" "}
                <a
                  href="mailto:soporte@veramed.cl"
                  className="font-semibold text-slate-950 underline"
                >
                  soporte@veramed.cl
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              11. MENSAJES, COMUNICACIONES Y SEGURIDAD
            </h2>
            <div className="mt-3 space-y-3">
              <p>
                Las comunicaciones entre Veramed y el Usuario pueden contener información
                confidencial sujeta a secreto profesional donde corresponda.
              </p>
              <p>
                Veramed no se responsabiliza por divulgaciones que ocurran fuera de sus sistemas
                (por ejemplo, por errores del proveedor de correo o accesos no autorizados del
                usuario).
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              12. CAMBIOS A ESTA POLÍTICA
            </h2>
            <div className="mt-3 space-y-3">
              <p>Veramed puede actualizar esta Política de Privacidad en cualquier momento.</p>
              <p>
                La versión vigente siempre estará publicada en el Sitio con su fecha de última
                actualización.
              </p>
              <p>
                El uso continuado del Sitio constituye tu aceptación de las modificaciones.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">
              13. LEGISLACIÓN APLICABLE Y JURISDICCIÓN
            </h2>
            <div className="mt-3 space-y-3">
              <p>Esta Política se interpreta según las leyes de la República de Chile.</p>
              <p>
                Cualquier controversia se someterá a los tribunales competentes de Santiago,
                Chile.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-950">14. CONTACTO</h2>
            <p className="mt-3">
              Si tienes preguntas o inquietudes sobre esta Política de Privacidad:{" "}
              <a
                href="mailto:contacto@veramed.cl"
                className="font-semibold text-slate-950 underline"
              >
                contacto@veramed.cl
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
