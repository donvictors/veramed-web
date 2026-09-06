import Image from "next/image";
import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="veramed-page min-h-screen text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <section className="grid items-stretch gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="veramed-panel relative overflow-hidden p-8 md:p-12">
            <p className="veramed-kicker">Contacto</p>
            <h1 className="veramed-display mt-5 max-w-2xl text-4xl md:text-6xl">
              Estamos aquí para orientarte.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              ¿Tienes una duda sobre el proceso, una solicitud o necesitas soporte? Escríbenos y
              cuéntanos brevemente en qué podemos ayudarte.
            </p>

            <Link
              href="mailto:contacto@mail.veramed.cl"
              className="veramed-primary-button mt-8"
            >
              contacto@mail.veramed.cl
              <span aria-hidden="true">↗</span>
            </Link>

            <div className="mt-12 grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-2">
              <ContactDetail label="Para" value="Consultas y soporte" />
              <ContactDetail label="Canal" value="Respuesta por correo" />
            </div>
          </div>

          <div className="veramed-dark-panel relative min-h-[28rem] overflow-hidden p-8 md:p-10">
            <div className="relative z-10 max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Atención responsable
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                Este canal no reemplaza una atención médica.
              </h2>
              <p className="mt-5 text-sm leading-7 text-slate-300">
                Si presentas una urgencia o síntomas de alarma, acude a un servicio de urgencia o
                contacta inmediatamente al dispositivo asistencial correspondiente.
              </p>
              <Link
                href="/#faq-sintomas-alarma"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white underline decoration-emerald-400 decoration-2 underline-offset-4"
              >
                Revisar síntomas de alarma
              </Link>
            </div>

            <div className="absolute -bottom-5 -right-6 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
            <Image
              src="/brand/voxel-robodoc.png"
              alt="Asistente médico digital de Veramed"
              width={320}
              height={320}
              className="absolute -bottom-8 -right-7 h-auto w-56 object-contain opacity-90 md:w-72"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function ContactDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
