"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MedicosLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/medicos-auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "No fue posible iniciar sesión.");
        return;
      }

      router.push("/portal-medicos");
      router.refresh();
    } catch {
      setError("No fue posible iniciar sesión en este momento.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-6 py-12 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.5)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Portal médico Veramed
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Acceso médicos
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
            Ingresa con tus credenciales para revisar o gestionar solicitudes pendientes.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-800">Correo</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="medico@veramed.cl"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-800">Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                required
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {isSubmitting ? "Ingresando..." : "Ingresar al portal"}
            </button>

            {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
          </form>
        </section>

        <aside className="rounded-[2rem] border border-slate-200 bg-gradient-to-b from-slate-900 to-slate-800 p-8 text-white shadow-[0_24px_80px_-50px_rgba(15,23,42,0.7)]">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
            <Image
              src="/brand/veramed-logo-white.png"
              alt="Veramed"
              width={420}
              height={120}
              className="h-auto w-48 sm:w-56"
              priority
            />
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
            ¿Quieres ser Veramed?
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-200">
            Si eres médico y quieres acceder al portal o usar prestaciones de emisión online de
            recetas, órdenes de exámenes y certificados por solo $4.990 mensual, escríbenos a{" "}
            <a href="mailto:contacto@mail.veramed.cl" className="font-semibold text-white underline">
              contacto@mail.veramed.cl
            </a>
            .
          </p>
        </aside>
      </div>
    </main>
  );
}
