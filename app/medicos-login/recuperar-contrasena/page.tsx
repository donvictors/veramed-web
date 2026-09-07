"use client";

import Link from "next/link";
import { useState } from "react";

export default function MedicalRecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/medicos-auth/password/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) throw new Error(data.error || "No pudimos procesar tu solicitud.");
      setMessage(data.message || "Revisa tu correo para continuar.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos procesar tu solicitud.");
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
            Recuperar contraseña
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Ingresa el correo registrado y enviaremos un enlace temporal para crear una nueva contraseña.
          </p>

          <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-900">Correo electrónico</span>
              <input
                className={inputClassName}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>
            {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          </form>

          <Link href="/medicos-login" className="mt-6 inline-flex text-sm font-semibold text-slate-900 underline">
            Volver al acceso médico
          </Link>
        </section>
      </div>
    </main>
  );
}

const inputClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
