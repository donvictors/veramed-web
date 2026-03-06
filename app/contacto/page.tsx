import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Contacto
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          Canal de contacto
        </h1>
        <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700">
          <p>
            Para consultas generales, soporte del flujo o aclaraciones sobre el alcance del
            servicio, puedes escribir a{" "}
            <Link href="mailto:contacto@mail.veramed.cl" className="font-semibold text-slate-950 underline">
              contacto@mail.veramed.cl
            </Link>
            .
          </p>
          <p className="mt-4">
            Este canal no reemplaza atención médica. Si presentas una urgencia, debes acudir a un
            servicio de urgencia o contactar el dispositivo asistencial correspondiente.
          </p>
        </div>
      </div>
    </main>
  );
}
