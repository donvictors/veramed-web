"use client";

import Link from "next/link";
import { useState } from "react";
import { registerWithEmail } from "@/lib/auth-api";

export default function CreateAccountPage() {
  const [firstName, setFirstName] = useState("");
  const [paternalSurname, setPaternalSurname] = useState("");
  const [maternalSurname, setMaternalSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!firstName.trim() || !paternalSurname.trim() || !maternalSurname.trim()) {
      setError("Completa nombre, apellido paterno y apellido materno.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const name = [firstName, paternalSurname, maternalSurname]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");

    try {
      setIsSubmitting(true);
      setError("");
      await registerWithEmail({ name, email, password });
      window.location.href = "/mi-cuenta";
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos crear tu cuenta.");
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
            Crear cuenta
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Guarda tus datos de acceso para revisar tus solicitudes y continuar tus órdenes.
          </p>

          <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Nombre">
                <input
                  className={inputCls}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </Field>

              <Field label="Apellido paterno">
                <input
                  className={inputCls}
                  value={paternalSurname}
                  onChange={(e) => setPaternalSurname(e.target.value)}
                />
              </Field>

              <Field label="Apellido materno">
                <input
                  className={inputCls}
                  value={maternalSurname}
                  onChange={(e) => setMaternalSurname(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Correo electrónico">
              <input
                className={inputCls}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field label="Contraseña">
              <input
                className={inputCls}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            <Field label="Confirmar contraseña">
              <input
                className={inputCls}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
            </button>

            {error && <p className="text-sm text-rose-600">{error}</p>}
          </form>

          <p className="mt-6 text-sm text-slate-600">
            ¿Ya tienes cuenta?{" "}
            <Link href="/ingresar" className="font-semibold text-slate-900 underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-900">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
