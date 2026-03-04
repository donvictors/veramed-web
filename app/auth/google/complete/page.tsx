"use client";

import { useEffect, useState } from "react";

export default function GoogleCompletePage() {
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function syncSession() {
      try {
        const response = await fetch("/api/auth/google/sync", {
          method: "POST",
        });

        const payload = (await response.json().catch(() => ({}))) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "No pudimos completar tu inicio de sesión con Google.");
        }

        if (!cancelled) {
          window.location.href = "/mi-cuenta";
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "No pudimos completar tu inicio de sesión con Google.",
          );
        }
      }
    }

    void syncSession();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Cuenta Veramed
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Validando inicio de sesión con Google…
          </h1>
          {error ? (
            <p className="mt-4 text-sm text-rose-600">{error}</p>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              Estamos completando tu ingreso. Serás redirigido en unos segundos.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
