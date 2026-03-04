"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Stepper from "@/components/checkup/Stepper";
import { fetchCheckupRequest } from "@/lib/checkup-api";
import { type ReviewStatus } from "@/lib/checkup";

const REVIEW_DELAY_MS = 8000;

export default function StatusPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ReviewStatus>("queued");
  const [secondsLeft, setSecondsLeft] = useState<number>(8);
  const requestId =
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("id");

  useEffect(() => {
    if (!requestId) {
      router.replace("/chequeo");
      return;
    }

    let isMounted = true;

    const sync = async () => {
      const checkup = await fetchCheckupRequest(requestId);
      if (!isMounted) return;

      startTransition(() => {
        setStatus(checkup.status.status);

        if (checkup.status.status !== "queued" || !checkup.status.queuedAt) {
          setSecondsLeft(0);
          return;
        }

        const elapsed = Date.now() - checkup.status.queuedAt;
        const remaining = Math.max(0, Math.ceil((REVIEW_DELAY_MS - elapsed) / 1000));
        setSecondsLeft(remaining);
      });
    };

    void sync().catch(() => {
      router.replace("/chequeo");
    });

    const interval = setInterval(() => {
      void sync().catch(() => {
        router.replace("/chequeo");
      });
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [requestId, router]);

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
              ? "Tu orden está en revisión por el equipo clínico y se encuentra en proceso de validación."
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
              description="¡Lo sentimos! Intenta solicitar nuevamente tu orden."
              active={status === "rejected"}
              tone="rose"
            />
          </div>

          {status === "queued" && (
            <div className="mt-8 rounded-3xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">En revisión</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                La orden se encuentra en cola de revisión. Estimación actual de resolución:
                <span className="font-semibold text-slate-900"> {secondsLeft}s</span>.
              </p>

              <div className="mt-5 h-2 w-full rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-slate-950 transition-[width]"
                  style={{ width: `${((8 - secondsLeft) / 8) * 100}%` }}
                />
              </div>

              <Link
                href={`/chequeo/resumen?id=${requestId}`}
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
                  href={`/chequeo/orden?id=${requestId}`}
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
                La solicitud requiere ajuste de antecedentes o una evaluación clínica adicional
                antes de su emisión.
              </p>
            </div>
          )}

          <p className="mt-6 text-xs leading-5 text-slate-500">
            Cada orden mantiene seguimiento de revisión y resolución clínica antes de su descarga.
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
