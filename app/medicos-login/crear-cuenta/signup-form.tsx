"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Invitation = {
  email: string;
  role: "portal" | "doctor" | "admin";
  expiresAt: string;
};

const roleLabels: Record<Invitation["role"], string> = {
  portal: "Acceso al portal",
  doctor: "Validador de órdenes",
  admin: "Coadministrador",
};

export default function MedicalInvitationSignup({ token }: { token: string }) {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [name, setName] = useState("");
  const [medicalRut, setMedicalRut] = useState("");
  const [sisRegistration, setSisRegistration] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function inspectInvitation() {
      if (!token) {
        setError("La invitación es inválida o expiró.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(
          `/api/medicos-auth/invitations/accept?token=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        const data = (await response.json().catch(() => ({}))) as Invitation & { error?: string };
        if (!response.ok) throw new Error(data.error || "La invitación es inválida o expiró.");
        if (!cancelled) setInvitation(data);
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "No pudimos validar la invitación.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void inspectInvitation();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 12) return setError("La contraseña debe tener al menos 12 caracteres.");
    if (password !== confirmation) return setError("Las contraseñas no coinciden.");

    setSubmitting(true);
    try {
      const response = await fetch("/api/medicos-auth/invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, name, medicalRut, sisRegistration, password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "No pudimos crear tu cuenta.");
      setDone(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos crear tu cuenta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="veramed-page min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.5)] sm:p-10">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Portal médico</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Crea tu cuenta Veramed</h1>
          </div>
          <Image src="/brand/veramed-icon.png" alt="Veramed" width={48} height={48} className="h-12 w-12" priority />
        </div>

        {loading ? <p className="mt-8 text-sm text-slate-600">Validando invitación…</p> : null}

        {!loading && invitation && !done ? (
          <>
            <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
              <p><span className="font-semibold">Correo:</span> {invitation.email}</p>
              <p><span className="font-semibold">Rol asignado:</span> {roleLabels[invitation.role]}</p>
            </div>
            <form onSubmit={submit} className="mt-7 grid gap-5">
              <Field label="Nombre completo">
                <input className={inputClassName} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="RUT médico">
                  <input className={inputClassName} value={medicalRut} onChange={(event) => setMedicalRut(event.target.value)} required />
                </Field>
                <Field label="Registro SIS">
                  <input className={inputClassName} value={sisRegistration} onChange={(event) => setSisRegistration(event.target.value)} required />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Contraseña">
                  <input className={inputClassName} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={12} required />
                </Field>
                <Field label="Confirmar contraseña">
                  <input className={inputClassName} type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={12} required />
                </Field>
              </div>
              <p className="text-xs leading-5 text-slate-500">Usa al menos 12 caracteres. El enlace quedará invalidado al crear la cuenta.</p>
              <button type="submit" disabled={submitting} className="rounded-2xl bg-emerald-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                {submitting ? "Creando cuenta…" : "Crear cuenta médica"}
              </button>
            </form>
          </>
        ) : null}

        {!loading && done ? (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="font-semibold text-emerald-950">Tu cuenta médica fue creada correctamente.</p>
            <Link href="/medicos-login" className="mt-4 inline-flex rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white">Ingresar al portal</Link>
          </div>
        ) : null}

        {!loading && error ? (
          <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p>{error}</p>
            {!invitation ? <Link href="/medicos-login" className="mt-3 inline-flex font-semibold underline">Volver al ingreso</Link> : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2"><span className="text-sm font-semibold text-slate-800">{label}</span>{children}</label>;
}

const inputClassName = "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";
