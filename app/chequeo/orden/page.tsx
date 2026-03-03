"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import {
  createOrderId,
  formatSex,
  formatSexualActivity,
  formatSmoking,
  inferOrderDetails,
  type StoredCheckup,
  type StoredCheckupStatus,
  type StoredPayment,
} from "@/lib/checkup";

export default function OrderPage() {
  const [data, setData] = useState<StoredCheckup | null>(null);
  const [approved, setApproved] = useState(false);
  const [paid, setPaid] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [issuedAt, setIssuedAt] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("veramed_checkup");
    const st = localStorage.getItem("veramed_checkup_status");
    const paymentRaw = localStorage.getItem("veramed_payment");
    const formattedDate = new Intl.DateTimeFormat("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date());

    let nextData: StoredCheckup | null = null;
    if (raw) {
      nextData = JSON.parse(raw) as StoredCheckup;
    }

    if (st) {
      const storedStatus = JSON.parse(st) as StoredCheckupStatus;
      const nextApproved = storedStatus.status === "approved";
      const payment = paymentRaw ? (JSON.parse(paymentRaw) as StoredPayment) : null;
      let nextOrderId = storedStatus.orderId;

      if (!nextOrderId) {
        nextOrderId = createOrderId();
        const nextStatus: StoredCheckupStatus = { ...storedStatus, orderId: nextOrderId };
        localStorage.setItem("veramed_checkup_status", JSON.stringify(nextStatus));
      }

      startTransition(() => {
        setData(nextData);
        setIssuedAt(formattedDate);
        setApproved(nextApproved);
        setPaid(Boolean(payment?.paid));
        setOrderId(nextOrderId);
      });
      return;
    }

    const payment = paymentRaw ? (JSON.parse(paymentRaw) as StoredPayment) : null;
    startTransition(() => {
      setData(nextData);
      setIssuedAt(formattedDate);
      setPaid(Boolean(payment?.paid));
      setOrderId(createOrderId());
    });
  }, []);

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <h1 className="text-2xl font-semibold">No hay datos del chequeo</h1>
          <p className="mt-2 text-slate-600">Vuelve a generar un chequeo primero.</p>
          <Link href="/chequeo" className="mt-6 inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm text-white">
            Ir a chequeo
          </Link>
        </div>
      </main>
    );
  }

  const orderDetails = inferOrderDetails(data.rec.tests);

  if (!paid) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Acceso restringido
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Debes completar el pago antes de descargar la orden.
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              La emisión clínica de la orden se habilita una vez confirmado el pago del servicio.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/chequeo/pago"
                className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Ir a pagar
              </Link>
              <Link
                href="/chequeo/resumen"
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Volver al resumen
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 print:bg-white">
      <div className="mx-auto max-w-5xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Orden clínica imprimible
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Orden de exámenes
            </h1>
            <p className="mt-1 text-sm text-slate-600">ID de referencia: {orderId}</p>
          </div>

          <div className="flex gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Imprimir / Guardar PDF
            </button>
            <Link
              href="/chequeo/estado"
              className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              Volver
            </Link>
          </div>
        </div>

        {!approved && (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 print:hidden">
            <p className="text-sm font-semibold text-amber-900">Orden pendiente de aprobación</p>
            <p className="mt-1 text-sm text-amber-800">
              La orden se encuentra en revisión clínica. Puedes revisar el avance en{" "}
              <Link className="font-semibold underline" href="/chequeo/estado">
                estado
              </Link>
              .
            </p>
          </div>
        )}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)] print:rounded-none print:border-none print:p-8 print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-6">
            <div>
              <BrandLogo className="h-14 w-auto" />
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Orden médica de laboratorio
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Solicitud de exámenes ambulatorios
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Documento generado desde el flujo de chequeo preventivo de Veramed. Uso sujeto a
                validación clínica y criterios del laboratorio ejecutante.
              </p>
            </div>

            <div className="grid gap-3 text-sm sm:min-w-72">
              <MetaRow label="ID" value={orderId} />
              <MetaRow label="Fecha y hora" value={issuedAt} />
              <MetaRow label="Estado" value={approved ? "Aprobada" : "Pendiente de validación"} />
              <MetaRow label="Ciudad de referencia" value="Santiago, Chile" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm md:grid-cols-2">
            <Info label="Edad" value={`${data.input.age}`} />
            <Info label="Sexo" value={formatSex(data.input.sex)} />
            <Info label="Peso" value={`${data.input.weightKg} kg`} />
            <Info label="Talla" value={`${data.input.heightCm} cm`} />
            <Info label="Tabaco" value={formatSmoking(data.input.smoking)} />
            <Info label="Actividad sexual" value={formatSexualActivity(data.input.sexualActivity)} />
          </div>

          <div className="mt-8 rounded-3xl bg-slate-50 p-5">
            <div className="grid gap-4 md:grid-cols-4">
              <SummaryCell label="Exámenes" value={`${orderDetails.includedCount}`} />
              <SummaryCell
                label="Ayuno"
                value={orderDetails.needsFasting ? "Sí" : "No"}
              />
              <SummaryCell label="Muestra" value={orderDetails.sampleTypeLabel} />
              <SummaryCell label="Vigencia sugerida" value="60 días" />
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Indicación clínica
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-700">{data.rec.summary}</p>
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Tabla de exámenes
            </p>
            <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-700">Examen</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Justificación clínica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {data.rec.tests.map((test) => (
                    <tr key={test.name}>
                      <td className="px-4 py-4 align-top font-semibold text-slate-900">
                        {test.name}
                      </td>
                      <td className="px-4 py-4 align-top text-slate-600">{test.why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-900">Preparación</p>
              <ul className="mt-3 grid gap-2 text-sm text-slate-700">
                {orderDetails.preparation.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-900">Disclaimers clínicos</p>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
                <li>Uso ambulatorio y preventivo. No corresponde para urgencias.</li>
                <li>La aceptación final depende del laboratorio y del contexto clínico real.</li>
                <li>No reemplaza consulta médica, diagnóstico ni indicación terapéutica.</li>
              </ul>
            </div>
          </div>

          {data.rec.notes.length > 0 && (
            <div className="mt-8 rounded-3xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Observaciones adicionales</p>
              <ul className="mt-3 grid gap-2 text-sm text-slate-700">
                {data.rec.notes.map((note, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 grid gap-6 border-t border-slate-200 pt-6 md:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Médico validador</p>
              <p className="mt-2 text-sm font-medium text-slate-700">Pendiente de asignación</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Este bloque identifica al profesional responsable, su registro aplicable y la firma
                utilizada para validar la orden.
              </p>
            </div>

            <div className="rounded-3xl bg-slate-950 p-5 text-white">
              <p className="text-sm font-semibold">Advertencia de uso</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                Esta orden debe interpretarse dentro del contexto clínico del paciente y no sirve
                para resolver cuadros agudos ni emergencias.
              </p>
            </div>
          </div>
        </section>

        <p className="mt-6 text-xs text-slate-500 print:hidden">
          Tip: usa “Imprimir” y selecciona “Guardar como PDF”.
        </p>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
