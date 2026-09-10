"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, inputClassName } from "@/app/portal-medicos/_components/PortalUi";

type MedicalRole = "portal" | "doctor" | "admin";

type MedicalUser = {
  id: string;
  email: string;
  name: string;
  medicalRut: string | null;
  sisRegistration: string | null;
  role: MedicalRole;
  active: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  isPrimaryAdmin: boolean;
  isCurrentUser: boolean;
};

type Invitation = {
  id: string;
  email: string;
  role: MedicalRole;
  expiresAt: string;
  createdAt: string;
};

type Patient = { id: string; name: string; email: string; createdAt: string };

type AdministrationData = {
  users: MedicalUser[];
  invitations: Invitation[];
  patients: Patient[];
  canViewPatients: boolean;
};

const roleCopy: Record<MedicalRole, { label: string; description: string }> = {
  portal: { label: "Acceso al portal", description: "Puede ingresar y usar las herramientas clínicas, sin validar órdenes." },
  doctor: { label: "Validador de órdenes", description: "Incluye acceso al portal y revisión de órdenes pendientes." },
  admin: { label: "Coadministrador", description: "Puede invitar y editar perfiles médicos, además de validar órdenes." },
};

function dateLabel(value: string | null) {
  if (!value) return "Nunca";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function UserAdministrationClient() {
  const [data, setData] = useState<AdministrationData | null>(null);
  const [tab, setTab] = useState<"medical" | "patients">("medical");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MedicalRole>("portal");
  const [editing, setEditing] = useState<MedicalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const response = await fetch("/api/medicos-auth/users", { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as AdministrationData & { error?: string };
      if (!response.ok) throw new Error(body.error || "No pudimos cargar los usuarios.");
      setData(body);
      if (!body.canViewPatients) setTab("medical");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeDoctors = useMemo(() => data?.users.filter((user) => user.active).length ?? 0, [data]);

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/medicos-auth/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || "No pudimos enviar la invitación.");
      setNotice(`Invitación enviada a ${email.trim().toLowerCase()}.`);
      setEmail("");
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos enviar la invitación.");
    } finally {
      setSending(false);
    }
  }

  async function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/medicos-auth/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: editing.id,
          name: editing.name,
          medicalRut: editing.medicalRut ?? "",
          sisRegistration: editing.sisRegistration ?? "",
          role: editing.role,
          active: editing.active,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || "No pudimos guardar el perfil.");
      setNotice(`Perfil de ${editing.email} actualizado.`);
      setEditing(null);
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos guardar el perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administración"
        title="Administrar usuarios"
        description="Invita médicos, define sus permisos y revisa las cuentas activas sin exponer credenciales."
        aside={
          <div className="grid grid-cols-2 gap-2">
            <Metric value={activeDoctors} label="Médicos activos" />
            {data?.canViewPatients ? <Metric value={data.patients.length} label="Pacientes" /> : null}
          </div>
        }
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}
      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Nuevo acceso</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Invitar a un médico</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Recibirá un enlace personal válido por 7 días para completar sus datos y crear su contraseña.</p>
          <form onSubmit={invite} className="mt-6 grid gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(230px,.8fr)_auto] lg:items-end">
            <Field label="Correo del médico">
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClassName} placeholder="medico@ejemplo.cl" required />
            </Field>
            <Field label="Rol inicial">
              <select value={role} onChange={(event) => setRole(event.target.value as MedicalRole)} className={inputClassName}>
                {(Object.keys(roleCopy) as MedicalRole[]).map((value) => <option key={value} value={value}>{roleCopy[value].label}</option>)}
              </select>
            </Field>
            <button type="submit" disabled={sending} className="rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300">
              {sending ? "Enviando…" : "Enviar invitación"}
            </button>
          </form>
          <p className="mt-3 text-xs leading-5 text-slate-500">{roleCopy[role].description}</p>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Invitaciones pendientes</p>
          <p className="mt-2 text-3xl font-semibold">{data?.invitations.length ?? 0}</p>
          <div className="mt-4 max-h-40 space-y-2 overflow-y-auto">
            {data?.invitations.map((invitation) => (
              <div key={invitation.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                <p className="truncate text-sm font-semibold">{invitation.email}</p>
                <p className="mt-1 text-xs text-slate-300">{roleCopy[invitation.role].label} · vence {dateLabel(invitation.expiresAt)}</p>
              </div>
            ))}
            {data && data.invitations.length === 0 ? <p className="text-sm text-slate-300">No hay invitaciones vigentes.</p> : null}
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
          <TabButton active={tab === "medical"} onClick={() => setTab("medical")}>Médicos</TabButton>
          {data?.canViewPatients ? <TabButton active={tab === "patients"} onClick={() => setTab("patients")}>Pacientes</TabButton> : null}
        </div>

        {loading ? <p className="py-10 text-sm text-slate-600">Cargando cuentas…</p> : null}

        {!loading && tab === "medical" ? (
          <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr><th className="px-5 py-4">Médico</th><th className="px-5 py-4">Rol</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Último ingreso</th><th className="px-5 py-4 text-right">Acción</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4"><p className="font-semibold text-slate-950">{user.name}</p><p className="mt-1 text-xs text-slate-500">{user.email}{user.isPrimaryAdmin ? " · Administrador principal" : ""}</p></td>
                      <td className="px-5 py-4"><RoleBadge role={user.role} /></td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${user.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{user.active ? "Activo" : "Inactivo"}</span></td>
                      <td className="px-5 py-4 text-slate-600">{dateLabel(user.lastLoginAt)}</td>
                      <td className="px-5 py-4 text-right"><button type="button" onClick={() => setEditing({ ...user })} disabled={user.isPrimaryAdmin && !data.canViewPatients} className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:border-emerald-400 hover:text-emerald-900 disabled:cursor-not-allowed disabled:opacity-40">Editar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {!loading && tab === "patients" && data?.canViewPatients ? (
          <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500"><tr><th className="px-5 py-4">Paciente</th><th className="px-5 py-4">Correo</th><th className="px-5 py-4">Cuenta creada</th><th className="px-5 py-4">Estado</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.patients.map((patient) => <tr key={patient.id}><td className="px-5 py-4 font-semibold text-slate-950">{patient.name}</td><td className="px-5 py-4 text-slate-600">{patient.email}</td><td className="px-5 py-4 text-slate-600">{dateLabel(patient.createdAt)}</td><td className="px-5 py-4"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">Vigente</span></td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      {editing ? <EditUserModal user={editing} canViewPatients={Boolean(data?.canViewPatients)} saving={saving} onChange={setEditing} onClose={() => setEditing(null)} onSubmit={saveUser} /> : null}
    </div>
  );
}

function EditUserModal({ user, canViewPatients, saving, onChange, onClose, onSubmit }: { user: MedicalUser; canViewPatients: boolean; saving: boolean; onChange: (user: MedicalUser) => void; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const protectedFromViewer = user.isPrimaryAdmin && !canViewPatients;
  const lockAccess = user.isPrimaryAdmin || user.isCurrentUser;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="edit-medical-user-title">
      <button type="button" className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} aria-label="Cerrar" />
      <form onSubmit={onSubmit} className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Perfil médico</p>
        <h2 id="edit-medical-user-title" className="mt-2 text-2xl font-semibold text-slate-950">Editar usuario</h2>
        <p className="mt-1 text-sm text-slate-500">{user.email}</p>
        {user.isPrimaryAdmin ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Esta cuenta es la administradora principal: su rol y acceso están protegidos.</div> : null}
        <div className="mt-6 grid gap-5">
          <Field label="Nombre completo"><input className={inputClassName} value={user.name} onChange={(event) => onChange({ ...user, name: event.target.value })} disabled={protectedFromViewer} required /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="RUT médico"><input className={inputClassName} value={user.medicalRut ?? ""} onChange={(event) => onChange({ ...user, medicalRut: event.target.value })} disabled={protectedFromViewer} required /></Field>
            <Field label="Registro SIS"><input className={inputClassName} value={user.sisRegistration ?? ""} onChange={(event) => onChange({ ...user, sisRegistration: event.target.value })} disabled={protectedFromViewer} required /></Field>
          </div>
          <Field label="Rol"><select className={inputClassName} value={user.role} onChange={(event) => onChange({ ...user, role: event.target.value as MedicalRole })} disabled={lockAccess || protectedFromViewer}>{(Object.keys(roleCopy) as MedicalRole[]).map((value) => <option key={value} value={value}>{roleCopy[value].label}</option>)}</select></Field>
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><span><span className="block text-sm font-semibold text-slate-900">Acceso vigente</span><span className="mt-1 block text-xs text-slate-500">Al desactivarlo, se cerrarán todas sus sesiones.</span></span><input type="checkbox" checked={user.active} onChange={(event) => onChange({ ...user, active: event.target.checked })} disabled={lockAccess || protectedFromViewer} className="h-5 w-5 accent-emerald-700" /></label>
        </div>
        <div className="mt-7 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancelar</button><button type="submit" disabled={saving || protectedFromViewer} className="rounded-xl bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300">{saving ? "Guardando…" : "Guardar cambios"}</button></div>
      </form>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) { return <div className="min-w-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm"><p className="text-xl font-semibold text-slate-950">{value}</p><p className="text-[11px] uppercase tracking-[.1em] text-slate-500">{label}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2"><span className="text-sm font-semibold text-slate-800">{label}</span>{children}</label>; }
function RoleBadge({ role }: { role: MedicalRole }) { return <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900">{roleCopy[role].label}</span>; }
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${active ? "bg-emerald-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>{children}</button>; }
