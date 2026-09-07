"use client";

import Link from "next/link";
import { useState } from "react";

export default function MedicalNewPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!token) return setError("El enlace es inválido o expiró.");
    if (password.length < 12) return setError("La contraseña debe tener al menos 12 caracteres.");
    if (password !== confirmation) return setError("Las contraseñas no coinciden.");

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/medicos-auth/password/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "No pudimos restablecer la contraseña.");
      setDone(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos restablecer la contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="veramed-page min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-xl px-6 py-12">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Portal médico Veramed
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Nueva contraseña
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Define una contraseña de al menos 12 caracteres. Al guardarla, cerraremos las sesiones médicas anteriores.
          </p>

          {!done ? (
            <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-900">Nueva contraseña</span>
                <input
                  className={inputClassName}
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-900">Confirmar contraseña</span>
                <input
                  className={inputClassName}
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                />
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting ? "Guardando..." : "Guardar nueva contraseña"}
              </button>
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            </form>
          ) : (
            <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-800">
                La contraseña fue actualizada y las sesiones anteriores quedaron cerradas.
              </p>
              <Link href="/medicos-login" className="mt-3 inline-flex text-sm font-semibold text-emerald-900 underline">
                Ingresar al portal médico
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const inputClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
