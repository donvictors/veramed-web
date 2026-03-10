"use client";

import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset } from "@/lib/auth-api";

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      setError("");
      const response = await requestPasswordReset(email);
      setMessage(response.message);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos procesar tu solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-xl px-6 py-12">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Cuenta Veramed
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Recuperar contraseña
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Ingresa tu correo y te enviaremos un enlace para definir una nueva contraseña.
          </p>

          <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-900">Correo electrónico</span>
              <input
                className={inputCls}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

            {message && <p className="text-sm text-emerald-700">{message}</p>}
            {error && <p className="text-sm text-rose-600">{error}</p>}
          </form>

          <p className="mt-6 text-sm text-slate-600">
            ¿Ya recuerdas tu contraseña?{" "}
            <Link href="/ingresar" className="font-semibold text-slate-900 underline">
              Volver a ingresar
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
