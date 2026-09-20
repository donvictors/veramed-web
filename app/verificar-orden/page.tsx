import type { Metadata } from "next";
import OrderVerificationForm from "./OrderVerificationForm";

export const metadata: Metadata = {
  title: "Verificar orden médica | Veramed",
  description: "Comprueba la vigencia de una receta médica emitida por Veramed usando su código.",
};

export default function VerifyOrderPage() {
  return (
    <main className="veramed-page min-h-screen text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
        <section className="mx-auto max-w-3xl">
          <p className="veramed-kicker">Verificación de documentos</p>
          <h1 className="veramed-display mt-5 text-4xl md:text-6xl">
            Verifica una receta emitida por Veramed.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
            Ingresa el código impreso en la receta. Te indicaremos si el documento está vigente y
            sus datos generales de emisión, sin mostrar información clínica del paciente.
          </p>
          <div className="mt-10">
            <OrderVerificationForm />
          </div>
        </section>
      </div>
    </main>
  );
}
