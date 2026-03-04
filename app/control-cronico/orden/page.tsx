"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import {
  fetchChronicControlRequest,
  type ChronicControlApiRecord,
} from "@/lib/chronic-control-api";
import {
  createVerificationCode,
  formatBirthDate,
} from "@/lib/checkup";
import {
  conditionLabel,
  medicationLabel,
} from "@/lib/chronic-control";

export default function ChronicControlOrderPage() {
  const router = useRouter();
  const [data, setData] = useState<ChronicControlApiRecord | null>(null);
  const [approved, setApproved] = useState(false);
  const [paid, setPaid] = useState(false);
  const [issuedAt, setIssuedAt] = useState("");
  const [issuedAtTimestamp, setIssuedAtTimestamp] = useState(0);
  const requestId =
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("id");

  useEffect(() => {
    if (!requestId) {
      router.replace("/control-cronico");
      return;
    }

    void fetchChronicControlRequest(requestId)
      .then((request) => {
        const issuedTimestamp =
          request.status.approvedAt ?? request.status.queuedAt ?? request.updatedAt;
        const formattedDate = new Intl.DateTimeFormat("es-CL", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(issuedTimestamp));

        startTransition(() => {
          setData(request);
          setIssuedAt(formattedDate);
          setIssuedAtTimestamp(issuedTimestamp);
          setApproved(request.status.status === "approved");
          setPaid(Boolean(request.payment.confirmed?.paid));
        });
      })
      .catch(() => {
        router.replace("/mi-cuenta");
      });
  }, [requestId, router]);

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <h1 className="text-2xl font-semibold">No hay datos del control</h1>
          <p className="mt-2 text-slate-600">Vuelve a generar un control primero.</p>
          <Link href="/control-cronico" className="mt-6 inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm text-white">
            Ir a control crónico
          </Link>
        </div>
      </main>
    );
  }

  if (!paid) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Debes completar el pago antes de descargar la orden.
            </h1>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/control-cronico/pago?id=${requestId}`}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Ir a pagar
              </Link>
              <Link
                href={`/control-cronico/resumen?id=${requestId}`}
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

  const patient = data.patient;
  const verificationCode = issuedAtTimestamp
    ? createVerificationCode(patient?.rut, issuedAtTimestamp)
    : "";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 print:bg-white">
      <div className="mx-auto max-w-5xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
        <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Orden clínica imprimible
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Orden de control crónico
            </h1>
            <p className="mt-1 text-sm text-slate-600">ID de referencia: {verificationCode}</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Imprimir / Guardar PDF
            </button>
            <Link
              href={`/control-cronico/estado?id=${requestId}`}
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
              <Link className="font-semibold underline" href={`/control-cronico/estado?id=${requestId}`}>
                estado
              </Link>
              .
            </p>
          </div>
        )}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)] print:hidden">
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-6">
            <div>
              <BrandLogo className="h-14 w-auto" />
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Orden médica de laboratorio
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Solicitud de exámenes de control crónico
              </h2>
            </div>

            <div className="grid gap-3 text-sm sm:min-w-72">
              <MetaRow label="ID" value={verificationCode} />
              <MetaRow label="Fecha y hora" value={issuedAt} />
              <MetaRow label="Estado" value={approved ? "Aprobada" : "Pendiente de validación"} />
              <MetaRow label="Ciudad de referencia" value="Santiago, Chile" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm md:grid-cols-2">
            <Info label="Nombre" value={patient?.fullName || "No informado"} />
            <Info label="RUT" value={patient?.rut || "No informado"} />
            <Info label="Fecha de nacimiento" value={formatBirthDate(patient?.birthDate || "")} />
            <Info label="Correo" value={patient?.email || "No informado"} />
            <Info label="Teléfono" value={patient?.phone || "No informado"} />
            <Info label="Dirección" value={patient?.address || "No informada"} />
            <Info label="Condiciones" value={data.conditions.map(conditionLabel).join(", ")} />
            <Info label="Años desde el diagnóstico" value={`${data.yearsSinceDiagnosis}`} />
            <Info label="Usa tratamiento" value={data.usesMedication ? "Sí" : "No"} />
            <Info
              label="Tratamientos declarados"
              value={
                data.usesMedication && data.selectedMedications.length > 0
                  ? data.selectedMedications.map(medicationLabel).join(", ")
                  : "Ninguno"
              }
            />
          </div>

          <div className="mt-8 rounded-3xl bg-slate-50 p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCell label="Condiciones" value={`${data.conditions.length}`} />
              <SummaryCell label="Exámenes" value={`${data.rec.tests.length}`} />
              <SummaryCell label="Vigencia sugerida" value="60 días" />
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Indicación clínica
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-700">{data.rec.summary}</p>
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200">
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
                    <td className="px-4 py-4 align-top font-semibold text-slate-900">{test.name}</td>
                    <td className="px-4 py-4 align-top text-slate-600">{test.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="hidden print:block print:px-8 print:py-6 print:pb-64">
          <div className="border-b border-slate-300 pb-4">
            <div className="flex items-start justify-between gap-8">
              <div>
                <BrandLogo className="h-28 w-auto" />
              </div>
              <div className="text-right text-sm leading-6">
                <p className="font-semibold text-slate-900">ORDEN MÉDICA DIGITAL</p>
                <p>{issuedAt}</p>
              </div>
            </div>
            <h2 className="mt-8 text-center text-3xl font-semibold text-slate-900">
              ORDEN DE LABORATORIO
            </h2>
          </div>

          <div className="mt-4 border-b border-slate-300 pb-4 text-sm">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <PrintRow label="Atención" value={issuedAt.split(",")[0] ?? issuedAt} />
                <PrintRow label="Paciente" value={patient?.fullName || "Paciente Veramed"} />
                <PrintRow label="RUT" value={patient?.rut || "No informado"} />
                <PrintRow label="Dirección" value={patient?.address || "No informada"} />
              </div>
              <div className="space-y-1">
                <PrintRow label="Nacimiento" value={formatBirthDate(patient?.birthDate || "")} />
                <PrintRow label="Correo" value={patient?.email || "No informado"} />
                <PrintRow label="Teléfono" value={patient?.phone || "No informado"} />
                <PrintRow
                  label="Condiciones"
                  value={
                    data.conditions.length > 0
                      ? data.conditions.map(conditionLabel).join(", ")
                      : "No declaradas"
                  }
                />
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-5 text-xs">
            {data.rec.tests.map((test) => (
              <div key={test.name} className="break-inside-avoid">
                <div className="flex gap-3">
                  <span className="mt-1">•</span>
                  <div>
                    <p className="font-semibold uppercase tracking-[0.02em] text-slate-900">{test.name}</p>
                    <p className="text-slate-700">Observaciones: {test.why}</p>
                    <p className="text-slate-700">
                      Fecha: {issuedAt.split(",")[0] ?? issuedAt}
                    </p>
                    <p className="text-slate-700">Código interno: {buildInternalCode(test.name)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="fixed bottom-16 right-8 w-72 bg-white text-center">
            <div className="mb-3 flex h-26 items-end justify-center border-b border-slate-500">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/firmas/firma-VRM.png"
                alt="Firma Dr. Víctor Rebolledo"
                loading="eager"
                decoding="sync"
                fetchPriority="high"
                className="h-28 w-80 object-contain"
              />
            </div>
            <p className="mt-1 text-sm text-slate-700">Dr. Víctor Rebolledo M.</p>
            <p className="text-sm text-slate-700">RUT 18.856.820-3</p>
            <p className="text-sm text-slate-700">Registro SIS N°611341</p>
          </div>

          <div className="fixed bottom-0 left-0 right-0 border-t border-slate-300 bg-white px-8 py-4 text-xs text-slate-600">
            <div className="grid grid-cols-3 items-end gap-8">
              <div>
                <p className="font-semibold text-slate-800">Código de verificación</p>
                <p>{verificationCode}</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-800">Fecha de emisión</p>
                <p>{issuedAt}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-800">veramed.cl</p>
                <p>Página 1 de 1</p>
              </div>
            </div>
          </div>
        </section>
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

function PrintRow({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="inline-block min-w-24 text-slate-700">{label}:</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </p>
  );
}

function buildInternalCode(testName: string) {
  const base = testName
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  return `VM-${base.padEnd(6, "0")}`;
}
