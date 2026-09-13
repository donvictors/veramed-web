"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClassName, PageHeader } from "@/app/portal-medicos/_components/PortalUi";
import { medicalPortalInitials } from "@/lib/medical-portal/profile";
import { MEDICAL_SPECIALTIES } from "@/lib/medical-portal/specialties";

type Doctor = {
  firstName: string;
  paternalSurname: string;
  maternalSurname: string;
  email: string;
  role: "portal" | "doctor" | "admin";
  specialty: string | null;
  medicalRut: string;
  sisRegistration: string;
};

export default function ProfileSettings({ doctor }: { doctor: Doctor }) {
  const router = useRouter();
  const [profile, setProfile] = useState(doctor);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  function updateProfile<K extends keyof Doctor>(key: K, value: Doctor[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError("");
    setProfileMessage("");
    try {
      const response = await fetch("/api/medicos-auth/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: profile.firstName,
          paternalSurname: profile.paternalSurname,
          maternalSurname: profile.maternalSurname,
          specialty: profile.specialty ?? "",
          medicalRut: profile.medicalRut,
          sisRegistration: profile.sisRegistration,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        user?: Partial<Doctor>;
      };
      if (!response.ok) {
        throw new Error(data.error || "No pudimos actualizar el perfil.");
      }
      if (data.user) {
        setProfile((current) => ({ ...current, ...data.user }));
      }
      setProfileMessage("Perfil actualizado correctamente.");
      router.refresh();
    } catch (nextError) {
      setProfileError(
        nextError instanceof Error ? nextError.message : "No pudimos actualizar el perfil.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    if (nextPassword.length < 12) {
      setPasswordError("La nueva contraseña debe tener al menos 12 caracteres.");
      return;
    }
    if (nextPassword !== confirmation) {
      setPasswordError("Las contraseñas no coinciden.");
      return;
    }
    setSavingPassword(true);
    try {
      const response = await fetch("/api/medicos-auth/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, nextPassword }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "No pudimos actualizar la contraseña.");
      }
      setPasswordMessage("Contraseña actualizada. Por seguridad debes iniciar sesión nuevamente.");
      window.setTimeout(() => {
        router.push("/medicos-login");
        router.refresh();
      }, 1200);
    } catch (nextError) {
      setPasswordError(
        nextError instanceof Error ? nextError.message : "No pudimos actualizar la contraseña.",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Perfil médico"
        title="Editar perfil"
        description="Actualiza tu identidad profesional y administra la contraseña asociada al portal."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-bold text-emerald-800 ring-1 ring-emerald-200">
              {medicalPortalInitials(profile)}
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Información profesional</h2>
              <p className="mt-1 text-sm text-slate-500">Estos datos identifican tu actividad en Veramed.</p>
            </div>
          </div>

          <form onSubmit={saveProfile} className="mt-6 grid gap-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Nombre">
                <input value={profile.firstName} onChange={(event) => updateProfile("firstName", event.target.value)} className={inputClassName} autoComplete="given-name" required />
              </Field>
              <Field label="Apellido paterno">
                <input value={profile.paternalSurname} onChange={(event) => updateProfile("paternalSurname", event.target.value)} className={inputClassName} autoComplete="family-name" />
              </Field>
              <Field label="Apellido materno">
                <input value={profile.maternalSurname} onChange={(event) => updateProfile("maternalSurname", event.target.value)} className={inputClassName} />
              </Field>
            </div>

            <Field label="Correo asociado">
              <input value={profile.email} className={`${inputClassName} bg-slate-50`} disabled readOnly />
            </Field>
            <Field label="Especialidad">
              <select value={profile.specialty ?? ""} onChange={(event) => updateProfile("specialty", event.target.value || null)} className={inputClassName}>
                <option value="">Especialidad no configurada</option>
                {MEDICAL_SPECIALTIES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="RUT médico">
                <input value={profile.medicalRut} onChange={(event) => updateProfile("medicalRut", event.target.value)} className={inputClassName} required />
              </Field>
              <Field label="Registro SIS">
                <input value={profile.sisRegistration} onChange={(event) => updateProfile("sisRegistration", event.target.value)} className={inputClassName} required />
              </Field>
            </div>
            <Field label="Rol">
              <input value={profile.role === "admin" ? "Coadministrador" : profile.role === "doctor" ? "Validador de órdenes" : "Acceso al portal"} className={`${inputClassName} bg-slate-50`} disabled readOnly />
            </Field>

            {profileMessage ? <p role="status" className="text-sm font-medium text-emerald-700">{profileMessage}</p> : null}
            {profileError ? <p role="alert" className="text-sm font-medium text-rose-700">{profileError}</p> : null}
            <button type="submit" disabled={savingProfile} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300">
              {savingProfile ? "Guardando..." : "Guardar perfil"}
            </button>
          </form>
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-950">Cambiar contraseña</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Este flujo utiliza la autenticación médica real y cerrará todas tus sesiones activas.</p>
          <form onSubmit={changePassword} className="mt-5 grid gap-5">
            <Field label="Contraseña actual"><input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClassName} required /></Field>
            <Field label="Nueva contraseña"><input type="password" autoComplete="new-password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} className={inputClassName} required /></Field>
            <Field label="Confirmar nueva contraseña"><input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={inputClassName} required /></Field>
            <button type="submit" disabled={savingPassword} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{savingPassword ? "Guardando..." : "Actualizar contraseña"}</button>
            {passwordMessage ? <p className="text-sm font-medium text-emerald-700">{passwordMessage}</p> : null}
            {passwordError ? <p className="text-sm font-medium text-rose-700">{passwordError}</p> : null}
          </form>
        </section>
      </div>
    </div>
  );
}
