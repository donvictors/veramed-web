"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClassName, IntegrationNotice, PageHeader } from "@/app/portal-medicos/_components/PortalUi";
import { MEDICAL_SPECIALTIES } from "@/lib/medical-portal/specialties";

type Doctor = { name: string; email: string; role: "doctor" | "admin"; specialty: string | null };

export default function ProfileSettings({ doctor }: { doctor: Doctor }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (nextPassword.length < 12) return setError("La nueva contraseña debe tener al menos 12 caracteres.");
    if (nextPassword !== confirmation) return setError("Las contraseñas no coinciden.");
    setSaving(true);
    try {
      const response = await fetch("/api/medicos-auth/password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ currentPassword, nextPassword }) });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "No pudimos actualizar la contraseña.");
      setMessage("Contraseña actualizada. Por seguridad debes iniciar sesión nuevamente.");
      setTimeout(() => { router.push("/medicos-login"); router.refresh(); }, 1200);
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "No pudimos actualizar la contraseña."); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Perfil médico" title="Editar perfil" description="Revisa tu identidad profesional y administra la contraseña asociada al portal." />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-950">Información profesional</h2>
          <div className="mt-5"><IntegrationNotice>El modelo médico actual no almacena especialidad ni avatar y no posee edición de nombre/correo. Estos controles quedan preparados sin persistencia para evitar crear un sistema paralelo.</IntegrationNotice></div>
          <div className="mt-5 grid gap-5"><Field label="Nombre completo"><input value={doctor.name} className={inputClassName} disabled readOnly /></Field><Field label="Correo asociado"><input value={doctor.email} className={inputClassName} disabled readOnly /></Field><Field label="Especialidad"><select value={doctor.specialty ?? ""} className={inputClassName} disabled><option value="">Especialidad no configurada</option>{MEDICAL_SPECIALTIES.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Rol"><input value={doctor.role === "admin" ? "Administrador" : "Médico"} className={inputClassName} disabled readOnly /></Field><button type="button" disabled className="rounded-xl bg-slate-300 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed">Guardar perfil</button></div>
        </section>
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-950">Cambiar contraseña</h2><p className="mt-2 text-sm leading-6 text-slate-500">Este flujo utiliza la autenticación médica real y cerrará todas tus sesiones activas.</p>
          <form onSubmit={changePassword} className="mt-5 grid gap-5"><Field label="Contraseña actual"><input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClassName} required /></Field><Field label="Nueva contraseña"><input type="password" autoComplete="new-password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} className={inputClassName} required /></Field><Field label="Confirmar nueva contraseña"><input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={inputClassName} required /></Field><button type="submit" disabled={saving} className="rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{saving ? "Guardando..." : "Actualizar contraseña"}</button>{message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}{error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}</form>
        </section>
      </div>
    </div>
  );
}
