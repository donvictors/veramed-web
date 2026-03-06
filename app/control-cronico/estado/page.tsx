"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Stepper from "@/components/checkup/Stepper";
import { fetchChronicControlRequest } from "@/lib/chronic-control-api";
import { type ReviewStatus } from "@/lib/checkup";
import { useRequestId } from "@/lib/use-request-id";

const REVIEW_DELAY_MS = 8000;

export default function ChronicControlStatusPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ReviewStatus>("queued");
  const [secondsLeft, setSecondsLeft] = useState<number>(8);
  const { requestId, resolved } = useRequestId();

  useEffect(() => {
    if (!resolved) {
      return;
    }

    if (!requestId) {
      router.replace("/mi-cuenta");
      return;
    }

    let isMounted = true;

    const sync = async () => {
      const request = await fetchChronicControlRequest(requestId);
      if (!isMounted) return;

      startTransition(() => {
        setStatus(request.status.status);

        if (request.status.status !== "queued" || !request.status.queuedAt) {
          setSecondsLeft(0);
          return;
        }

        const elapsed = Date.now() - request.status.queuedAt;
        const remaining = Math.max(0, Math.ceil((REVIEW_DELAY_MS - elapsed) / 1000));
        setSecondsLeft(remaining);
      });
    };

    void sync().catch(() => {
      router.replace("/mi-cuenta");
    });

    const interval = setInterval(() => {
      void sync().catch(() => {
        router.replace("/mi-cuenta");
      });
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [requestId, resolved, router]);

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
              ? "Tu orden de control está en revisión por el equipo clínico."
              : "La validación clínica fue aprobada y la orden ya puede abrirse en formato imprimible."}
          </p>
        </div>

        <div className="mt-8">
          <Stepper currentStep={3} />
        </div>

        <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
          <div className="grid gap-4 md:grid-cols-2">
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
                href={`/control-cronico/resumen?id=${requestId}`}
                className="mt-5 inline-flex text-sm font-semibold text-slate-700 transition hover:text-slate-950"
              >
                Volver al resumen
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
                  href={`/control-cronico/orden?id=${requestId}`}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Ver orden
                </Link>
                <Link
                  href="/control-cronico"
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Nuevo control
                </Link>
              </div>
            </div>
          )}
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
  tone: "amber" | "emerald";
}) {
  const toneClasses =
    tone === "amber"
      ? "bg-amber-50 border-amber-200 text-amber-900"
      : "bg-emerald-50 border-emerald-200 text-emerald-900";

  return (
    <div
      className={`rounded-3xl border p-4 ${
        active ? toneClasses : "border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            tone === "amber" ? "bg-amber-500" : "bg-emerald-500"
          }`}
        />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mt-2 text-sm leading-6">{description}</p>
    </div>
  );
}
