"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import { fetchCheckupRequest, type CheckupApiRecord } from "@/lib/checkup-api";
import {
  createVerificationCode,
  formatBirthDate,
  formatSex,
  formatSexualActivity,
  formatSmoking,
  inferOrderDetails,
} from "@/lib/checkup";

export default function OrderPage() {
  const router = useRouter();
  const [data, setData] = useState<CheckupApiRecord | null>(null);
  const [approved, setApproved] = useState(false);
  const [paid, setPaid] = useState(false);
  const [issuedAt, setIssuedAt] = useState("");
  const [issuedAtTimestamp, setIssuedAtTimestamp] = useState(0);
  const requestId =
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("id");

  useEffect(() => {
    if (!requestId) {
      router.replace("/chequeo");
      return;
    }

    void fetchCheckupRequest(requestId)
      .then((checkup) => {
        const issuedTimestamp =
          checkup.status.approvedAt ?? checkup.status.queuedAt ?? checkup.updatedAt;
        const formattedDate = new Intl.DateTimeFormat("es-CL", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(issuedTimestamp));

        startTransition(() => {
          setData(checkup);
          setIssuedAt(formattedDate);
          setIssuedAtTimestamp(issuedTimestamp);
          setApproved(checkup.status.status === "approved");
          setPaid(Boolean(checkup.payment.confirmed?.paid));
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
  const patient = data.patient;
  const verificationCode = issuedAtTimestamp
    ? createVerificationCode(patient?.rut, issuedAtTimestamp)
    : "";

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
                href={`/chequeo/pago?id=${requestId}`}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Ir a pagar
              </Link>
              <Link
                href={`/chequeo/resumen?id=${requestId}`}
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
        <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Orden clínica imprimible
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Orden de exámenes
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
              href={`/chequeo/estado?id=${requestId}`}
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
              <Link className="font-semibold underline" href={`/chequeo/estado?id=${requestId}`}>
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
                Solicitud de exámenes ambulatorios
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Documento generado desde el flujo de chequeo preventivo de Veramed. Uso sujeto a
                validación clínica y criterios del laboratorio ejecutante.
              </p>
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
                <PrintRow label="Muestra" value={orderDetails.sampleTypeLabel} />
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
                    <p className="text-slate-700">
                      Observaciones: {getPreparationNote(test.name, orderDetails.needsFasting)}
                    </p>
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
            <p className="text-sm text-slate-700">Staff clínico VeraMed</p>
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

function getPreparationNote(testName: string, needsFasting: boolean) {
  const lowerName = testName.toLowerCase();
  if (lowerName.includes("orina")) {
    return "Idealmente usar muestra de la mañana.";
  }
  if (
    needsFasting &&
    (lowerName.includes("glicemia") || lowerName.includes("perfil lip") || lowerName.includes("hba1c"))
  ) {
    return "Requiere ayuno de 8 horas.";
  }
  return "No requiere preparación especial.";
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
