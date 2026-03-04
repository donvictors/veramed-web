"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Stepper from "@/components/checkup/Stepper";
import WhatToExpect from "@/components/checkup/WhatToExpect";
import { fetchCheckupRequest, type CheckupApiRecord } from "@/lib/checkup-api";
import { inferOrderDetails } from "@/lib/checkup";

export default function SummaryPage() {
  const router = useRouter();
  const [data, setData] = useState<CheckupApiRecord | null>(null);
  const requestId =
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("id");

  useEffect(() => {
    if (!requestId) {
      router.replace("/chequeo");
      return;
    }

    void fetchCheckupRequest(requestId)
      .then((checkup) => {
        startTransition(() => {
          setData(checkup);
        });
      })
      .catch(() => {
        router.replace("/chequeo");
      });
  }, [requestId, router]);

  if (!data) return null;

  const orderDetails = inferOrderDetails(data.rec.tests);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Resumen del chequeo
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              Tu ficha de orden está lista para revisión.
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">{data.rec.summary}</p>
          </div>

          <Link
            href={`/chequeo?id=${data.id}`}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          >
            Editar datos
          </Link>
        </div>

        <div className="mt-8">
          <Stepper currentStep={2} />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Ficha de orden</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Checklist clínico para laboratorio
                </h2>
              </div>
              <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                Vigencia sugerida: 60 días
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <MetricCard
                label={`Incluye ${orderDetails.includedCount} exámenes`}
                value="Set recomendado"
              />
              <MetricCard
                label={`Necesita ayuno: ${orderDetails.needsFasting ? "Sí" : "No"}`}
                value="Preparación previa"
              />
              <MetricCard label={`Tipo de muestra: ${orderDetails.sampleTypeLabel}`} value="Muestras" />
              <MetricCard label="Orden ambulatoria" value="Uso sugerido" />
            </div>

            <div className="mt-6 rounded-3xl bg-slate-50 p-5">
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

            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-900">Exámenes incluidos</p>
              <div className="mt-4 grid gap-3">
                {data.rec.tests.map((t) => (
                  <div key={t.name} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{t.why}</p>
                  </div>
                ))}
              </div>
            </div>

            {data.rec.notes.length > 0 && (
              <div className="mt-6 rounded-3xl border border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-900">Notas clínicas</p>
                <ul className="mt-3 grid gap-2 text-sm text-slate-700">
                  {data.rec.notes.map((n, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <div className="grid gap-6">
            <WhatToExpect />

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Siguiente paso
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                Continúa al pago para emitir la orden.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                El pago habilita la validación clínica y la posterior descarga de tu orden médica.
              </p>

              <Link
                href={`/chequeo/pago?id=${data.id}`}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Ir a pagar
              </Link>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Una vez confirmado el pago, la solicitud pasa a revisión y queda disponible para
                descarga.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-sm text-slate-500">{value}</p>
    </div>
  );
}
