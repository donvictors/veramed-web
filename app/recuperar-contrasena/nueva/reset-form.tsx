"use client";

import Link from "next/link";
import { useState } from "react";
import { confirmPasswordReset } from "@/lib/auth-api";

export default function NewPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("El enlace es inválido o expiró.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await confirmPasswordReset(token, password);
      setDone(true);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "No pudimos restablecer tu contraseña.",
      );
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
            Nueva contraseña
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Define tu nueva contraseña para recuperar el acceso a tu cuenta.
          </p>

          {!done ? (
            <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-900">Nueva contraseña</span>
                <input
                  className={inputCls}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-900">Confirmar contraseña</span>
                <input
                  className={inputCls}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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

              {error && <p className="text-sm text-rose-600">{error}</p>}
            </form>
          ) : (
            <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-800">
                Tu contraseña fue actualizada correctamente.
              </p>
              <Link
                href="/ingresar"
                className="mt-3 inline-flex text-sm font-semibold text-emerald-900 underline"
              >
                Ir a iniciar sesión
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
