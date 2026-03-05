"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCurrentUser, updateAccountProfile } from "@/lib/auth-api";
import {
  formatRut,
  isValidRut,
  normalizeRut,
  splitPatientFullName,
  calculateAgeFromBirthDate,
} from "@/lib/checkup";

type ProfileForm = {
  firstName: string;
  paternalSurname: string;
  maternalSurname: string;
  rut: string;
  birthDate: string;
  email: string;
  phone: string;
  address: string;
};

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

export default function AccountProfileEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<ProfileForm>({
    firstName: "",
    paternalSurname: "",
    maternalSurname: "",
    rut: "",
    birthDate: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    void fetchCurrentUser()
      .then((response) => {
        if (!response.authenticated || !response.user) {
          router.replace("/ingresar");
          return;
        }

        const nameFields = splitPatientFullName(response.user.profile.fullName || response.user.name);

        setForm({
          firstName: nameFields.firstName,
          paternalSurname: nameFields.paternalSurname,
          maternalSurname: nameFields.maternalSurname,
          rut: formatRut(normalizeRut(response.user.profile.rut)),
          birthDate: response.user.profile.birthDate || "",
          email: response.user.profile.email || response.user.email,
          phone: response.user.profile.phone || "",
          address: response.user.profile.address || "",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const age = useMemo(() => calculateAgeFromBirthDate(form.birthDate), [form.birthDate]);
  const rutInvalid = form.rut.trim().length > 0 && !isValidRut(form.rut);

  function updateField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setNotice("");

      const updated = await updateAccountProfile({
        firstName: form.firstName.trim(),
        paternalSurname: form.paternalSurname.trim(),
        maternalSurname: form.maternalSurname.trim(),
        rut: formatRut(normalizeRut(form.rut)),
        birthDate: form.birthDate,
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });

      setNotice("Datos actualizados correctamente.");
      setForm((current) => ({
        ...current,
        rut: formatRut(normalizeRut(updated.profile.rut)),
      }));
      window.setTimeout(() => {
        router.push("/mi-cuenta");
      }, 600);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No pudimos guardar tus cambios.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-4xl px-6 py-10 md:py-12">
          <p className="text-sm text-slate-600">Cargando datos...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-10 md:py-12">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Mi cuenta
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Editar datos personales</h1>
          <p className="mt-2 text-sm text-slate-600">
            Actualiza los datos que se usarán para autocompletar tus órdenes.
          </p>

          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <Field label="Nombre">
              <input
                className={inputCls}
                value={form.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                required
              />
            </Field>

            <Field label="Apellido paterno">
              <input
                className={inputCls}
                value={form.paternalSurname}
                onChange={(e) => updateField("paternalSurname", e.target.value)}
                required
              />
            </Field>

            <Field label="Apellido materno">
              <input
                className={inputCls}
                value={form.maternalSurname}
                onChange={(e) => updateField("maternalSurname", e.target.value)}
                required
              />
            </Field>

            <Field label="RUT">
              <input
                className={`${inputCls} ${rutInvalid ? "border-rose-400 focus:border-rose-400 focus:ring-rose-100" : ""}`}
                value={form.rut}
                onChange={(e) => updateField("rut", formatRut(e.target.value))}
                onBlur={(e) => updateField("rut", formatRut(e.target.value))}
                required
              />
              {rutInvalid && <p className="text-xs text-rose-600">RUT inválido.</p>}
            </Field>

            <Field label="Fecha de nacimiento">
              <input
                className={inputCls}
                type="date"
                value={form.birthDate}
                onChange={(e) => updateField("birthDate", e.target.value)}
                required
              />
            </Field>

            <Field label="Edad">
              <input className={`${inputCls} bg-slate-100`} value={age > 0 ? String(age) : ""} readOnly />
            </Field>

            <Field label="Correo">
              <input
                className={inputCls}
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
              />
            </Field>

            <Field label="Teléfono">
              <input
                className={inputCls}
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </Field>

            <Field label="Dirección" className="md:col-span-2">
              <input
                className={inputCls}
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
              />
            </Field>

            {error && (
              <p className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}
            {notice && (
              <p className="md:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {notice}
              </p>
            )}

            <div className="mt-2 flex flex-col gap-2 md:col-span-2 sm:flex-row">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
              <Link
                href="/mi-cuenta"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Volver a mi cuenta
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-2 ${className}`}>
      <span className="text-sm font-medium text-slate-900">{label}</span>
      {children}
    </label>
  );
}

