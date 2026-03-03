"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Stepper from "@/components/checkup/Stepper";
import WhatToExpect from "@/components/checkup/WhatToExpect";
import {
  CHRONIC_CONTROL_PRICE_CLP,
  conditionLabel,
  medicationLabel,
  type StoredChronicControl,
} from "@/lib/chronic-control";

export default function ChronicControlSummaryPage() {
  const router = useRouter();
  const [data, setData] = useState<StoredChronicControl | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("veramed_chronic_control");
    if (!raw) {
      router.replace("/control-cronico");
      return;
    }

    const parsed = JSON.parse(raw) as StoredChronicControl;
    startTransition(() => {
      setData(parsed);
    });
  }, [router]);

  if (!data) return null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Resumen del control
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              Tu orden de control está lista para revisión.
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">{data.rec.summary}</p>
          </div>

          <Link
            href="/control-cronico"
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
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Orden de control
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Seguimiento por condición crónica
                </h2>
              </div>
              <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                ${CHRONIC_CONTROL_PRICE_CLP.toLocaleString("es-CL")}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <MetricCard
                label={`${data.conditions.length} condición${data.conditions.length === 1 ? "" : "es"} seleccionada${data.conditions.length === 1 ? "" : "s"}`}
                value={data.conditions.map(conditionLabel).join(", ")}
              />
              <MetricCard
                label={`${data.rec.tests.length} exámenes incluidos`}
                value="Set consolidado"
              />
              <MetricCard
                label="Tratamiento actual"
                value={data.usesMedication ? "Sí" : "No"}
              />
              <MetricCard
                label="Años desde el diagnóstico"
                value={`${data.yearsSinceDiagnosis}`}
              />
            </div>

            {data.usesMedication && data.selectedMedications.length > 0 && (
              <div className="mt-6 rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Tratamientos declarados</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {data.selectedMedications.map(medicationLabel).join(", ")}.
                </p>
              </div>
            )}

            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-900">Exámenes incluidos</p>
              <div className="mt-4 grid gap-3">
                {data.rec.tests.map((test) => (
                  <div key={test.name} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">{test.name}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{test.why}</p>
                  </div>
                ))}
              </div>
            </div>

            {data.rec.notes.length > 0 && (
              <div className="mt-6 rounded-3xl border border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-900">Notas clínicas</p>
                <ul className="mt-3 grid gap-2 text-sm text-slate-700">
                  {data.rec.notes.map((note) => (
                    <li key={note} className="flex gap-2">
                      <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{note}</span>
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
                El pago habilita la validación clínica y la emisión de tu orden de control.
              </p>

              <Link
                href="/control-cronico/pago"
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Ir a pagar
              </Link>
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
