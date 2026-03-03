"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Stepper from "@/components/checkup/Stepper";
import { type ReviewStatus, type StoredCheckupStatus } from "@/lib/checkup";

export default function StatusPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ReviewStatus>("queued");
  const [secondsLeft, setSecondsLeft] = useState<number>(8);
  const rejectionProbability = 0;

  useEffect(() => {
    const raw = localStorage.getItem("veramed_checkup_status");
    if (!raw) {
      router.replace("/chequeo");
      return;
    }

    const stored = JSON.parse(raw) as StoredCheckupStatus;
    startTransition(() => {
      setStatus(stored.status);
      if (stored.status !== "queued") {
        setSecondsLeft(0);
      }
    });

    if (stored.status !== "queued") {
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    const resolveReview = setTimeout(() => {
      const nextStatus: ReviewStatus =
        Math.random() < rejectionProbability ? "rejected" : "approved";
      const nextPayload: StoredCheckupStatus = {
        ...stored,
        status: nextStatus,
        approvedAt: nextStatus === "approved" ? Date.now() : undefined,
        rejectedAt: nextStatus === "rejected" ? Date.now() : undefined,
      };

      localStorage.setItem("veramed_checkup_status", JSON.stringify(nextPayload));
      setStatus(nextStatus);
    }, 8000);

    return () => {
      clearInterval(interval);
      clearTimeout(resolveReview);
    };
  }, [rejectionProbability, router]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-10 md:py-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Estado de la solicitud
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Seguimiento de validación clínica.
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            {status === "queued"
              ? "Tu orden está en revisión por el equipo clínico. El flujo sigue siendo simulado, pero el lenguaje y los estados ya están preparados para producción."
              : status === "approved"
                ? "La validación clínica fue aprobada y la orden ya puede abrirse en formato imprimible."
                : "La solicitud fue rechazada y requiere corrección o evaluación clínica directa antes de emitir una orden."}
          </p>
        </div>

        <div className="mt-8">
          <Stepper currentStep={3} />
        </div>

        <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
          <div className="grid gap-4 md:grid-cols-3">
            <StatusCard
              title="En revisión"
              description="Solicitud recibida y pendiente de resolución clínica."
              active={status === "queued"}
              tone="amber"
            />
            <StatusCard
              title="Aprobada"
              description="Orden validada y lista para descarga o impresión."
              active={status === "approved"}
              tone="emerald"
            />
            <StatusCard
              title="Rechazada"
              description="Estado UI preparado para futuras observaciones clínicas."
              active={status === "rejected"}
              tone="rose"
            />
          </div>

          {status === "queued" && (
            <div className="mt-8 rounded-3xl bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">En revisión</p>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  Simulación activa
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                La orden se encuentra en cola de revisión. En este MVP se resolverá automáticamente
                en <span className="font-semibold text-slate-900">{secondsLeft}s</span>.
              </p>

              <div className="mt-5 h-2 w-full rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-slate-950 transition-[width]"
                  style={{ width: `${((8 - secondsLeft) / 8) * 100}%` }}
                />
              </div>

              <Link
                href="/chequeo/resumen"
                className="mt-5 inline-flex text-sm font-semibold text-slate-700 transition hover:text-slate-950"
              >
                Volver a la ficha de orden
              </Link>
            </div>
          )}

          {status === "approved" && (
            <div className="mt-8 rounded-3xl bg-emerald-50 p-5">
              <p className="text-sm font-semibold text-emerald-900">Aprobada</p>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Ya puedes abrir la orden formal, imprimirla o guardarla como PDF.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/chequeo/orden"
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Ver orden
                </Link>
                <Link
                  href="/chequeo"
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Nuevo chequeo
                </Link>
              </div>
            </div>
          )}

          {status === "rejected" && (
            <div className="mt-8 rounded-3xl bg-rose-50 p-5">
              <p className="text-sm font-semibold text-rose-900">Rechazada</p>
              <p className="mt-2 text-sm leading-6 text-rose-800">
                Este estado está preparado solo como stub de interfaz. En producción aquí irían
                observaciones clínicas y acciones de corrección.
              </p>
            </div>
          )}

          <p className="mt-6 text-xs leading-5 text-slate-500">
            En producción esto debe conectarse a una cola real, historial de revisión y médico
            validador identificado.
          </p>
        </div>
      </div>
    </main>
  );
}

function StatusCard({
  title,
  description,
  active,
  tone,
}: {
  title: string;
  description: string;
  active: boolean;
  tone: "amber" | "emerald" | "rose";
}) {
  const toneClasses =
    tone === "amber"
      ? "bg-amber-50 border-amber-200 text-amber-900"
      : tone === "emerald"
        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
        : "bg-rose-50 border-rose-200 text-rose-900";

  return (
    <div
      className={`rounded-3xl border p-4 ${
        active ? toneClasses : "border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            tone === "amber"
              ? "bg-amber-500"
              : tone === "emerald"
                ? "bg-emerald-500"
                : "bg-rose-500"
          }`}
        />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mt-2 text-sm leading-6">{description}</p>
    </div>
  );
}
