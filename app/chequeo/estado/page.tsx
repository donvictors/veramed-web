"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function StatusPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"queued" | "approved">("queued");
  const [secondsLeft, setSecondsLeft] = useState<number>(8);

  useEffect(() => {
    const raw = localStorage.getItem("veramed_checkup_status");
    if (!raw) {
      router.replace("/chequeo");
      return;
    }

    // Countdown + auto-approve (MVP)
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    const approve = setTimeout(() => {
      localStorage.setItem(
        "veramed_checkup_status",
        JSON.stringify({ status: "approved", approvedAt: Date.now() })
      );
      setStatus("approved");
    }, 8000);

    return () => {
      clearInterval(interval);
      clearTimeout(approve);
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Estado de tu orden</h1>
        <p className="mt-2 text-slate-600">
          {status === "queued"
            ? "Tu solicitud está en cola para validación médica."
            : "Validación completada. Tu orden está lista."}
        </p>

        <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          {status === "queued" ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                <span className="font-medium">En validación</span>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                (MVP) Simulando aprobación automática en:{" "}
                <span className="font-semibold">{secondsLeft}s</span>
              </p>

              <div className="mt-6 h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-slate-900"
                  style={{ width: `${((8 - secondsLeft) / 8) * 100}%` }}
                />
              </div>

              <Link href="/chequeo/resumen" className="mt-6 inline-block text-sm text-slate-600 hover:text-slate-900">
                Volver al resumen
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" />
                <span className="font-medium">Aprobada</span>
              </div>

              <p className="mt-4 text-sm text-slate-600">
                Ya puedes abrir la orden imprimible.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/chequeo/orden"
                  className="rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-medium text-white hover:bg-slate-800"
                >
                  Ver orden
                </Link>
                <Link
                  href="/chequeo"
                  className="rounded-xl border px-5 py-3 text-center text-sm font-medium text-slate-900 hover:bg-slate-50"
                >
                  Nuevo chequeo
                </Link>
              </div>
            </>
          )}

          <p className="mt-6 text-xs text-slate-500">
            En producción real: esto sería una cola real + validación por médico.
          </p>
        </div>
      </div>
    </main>
  );
}