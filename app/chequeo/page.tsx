"use client";

import { useMemo, useState } from "react";
import Stepper from "@/components/checkup/Stepper";
import { createCheckupRequest } from "@/lib/checkup-api";
import {
  type CheckupInput,
  type PatientDetails,
  type Pregnancy,
  type Sex,
  type SexualActivity,
  type Smoking,
  recommend,
} from "@/lib/checkup";

export default function CheckupPage() {
  const [age, setAge] = useState(30);
  const [sex, setSex] = useState<Sex>("M");
  const [weightKg, setWeightKg] = useState(75);
  const [heightCm, setHeightCm] = useState(175);
  const [smoking, setSmoking] = useState<Smoking>("never");
  const [sexualActivity, setSexualActivity] = useState<SexualActivity>("no");
  const [pregnancy, setPregnancy] = useState<Pregnancy>("no");
  const [patient, setPatient] = useState<PatientDetails>({
    fullName: "",
    rut: "",
    birthDate: "",
    email: "",
    phone: "",
    address: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const input: CheckupInput = useMemo(
    () => ({ age, sex, weightKg, heightCm, smoking, sexualActivity, pregnancy }),
    [age, sex, weightKg, heightCm, smoking, sexualActivity, pregnancy]
  );

  const rec = useMemo(() => recommend(input), [input]);

  async function handleContinue() {
    try {
      setIsSubmitting(true);
      setSubmitError("");

      const checkup = await createCheckupRequest({ input, patient });
      window.location.href = `/chequeo/resumen?id=${checkup.id}`;
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "No pudimos crear tu solicitud.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Chequeo preventivo
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Completa tus datos y revisa la recomendación.
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Mantuvimos la lógica actual del chequeo y mejoramos la presentación para que el flujo
            sea más claro, clínico y fácil de revisar.
          </p>
        </div>

        <div className="mt-8">
          <Stepper currentStep={1} />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
            <div className="grid gap-6">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">1. Datos del paciente</p>
                <p className="mt-1 text-sm text-slate-600">
                  Estos datos se usarán para completar la orden médica.
                </p>

                <div className="mt-5 grid gap-5">
                  <Field label="Nombre completo">
                    <input
                      className={inputCls}
                      value={patient.fullName}
                      onChange={(e) =>
                        setPatient((current) => ({ ...current, fullName: e.target.value }))
                      }
                    />
                  </Field>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="RUT">
                      <input
                        className={inputCls}
                        value={patient.rut}
                        onChange={(e) =>
                          setPatient((current) => ({ ...current, rut: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Fecha de nacimiento">
                      <input
                        className={inputCls}
                        type="date"
                        value={patient.birthDate}
                        onChange={(e) =>
                          setPatient((current) => ({ ...current, birthDate: e.target.value }))
                        }
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Correo electrónico">
                      <input
                        className={inputCls}
                        type="email"
                        value={patient.email}
                        onChange={(e) =>
                          setPatient((current) => ({ ...current, email: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Teléfono">
                      <input
                        className={inputCls}
                        value={patient.phone}
                        onChange={(e) =>
                          setPatient((current) => ({ ...current, phone: e.target.value }))
                        }
                      />
                    </Field>
                  </div>

                  <Field label="Dirección">
                    <input
                      className={inputCls}
                      value={patient.address}
                      onChange={(e) =>
                        setPatient((current) => ({ ...current, address: e.target.value }))
                      }
                    />
                  </Field>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Edad">
                      <input
                        className={inputCls}
                        type="number"
                        min={18}
                        max={120}
                        value={age}
                        onChange={(e) => setAge(Number(e.target.value))}
                      />
                    </Field>

                    <Field label="Sexo (biológico)">
                      <select
                        className={inputCls}
                        value={sex}
                        onChange={(e) => setSex(e.target.value as Sex)}
                      >
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                      </select>
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Peso (kg)">
                      <input
                        className={inputCls}
                        type="number"
                        min={30}
                        max={300}
                        value={weightKg}
                        onChange={(e) => setWeightKg(Number(e.target.value))}
                      />
                    </Field>
                    <Field label="Talla (cm)">
                      <input
                        className={inputCls}
                        type="number"
                        min={120}
                        max={230}
                        value={heightCm}
                        onChange={(e) => setHeightCm(Number(e.target.value))}
                      />
                    </Field>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">2. Contexto clínico</p>
                <p className="mt-1 text-sm text-slate-600">
                  Estos datos ajustan la recomendación clínica y permiten personalizar la orden.
                </p>

                <div className="mt-5 grid gap-5">
                  <Field label="Tabaco">
                    <select
                      className={inputCls}
                      value={smoking}
                      onChange={(e) => setSmoking(e.target.value as Smoking)}
                    >
                      <option value="never">Nunca</option>
                      <option value="former">Ex fumador</option>
                      <option value="current">Fumador actual</option>
                    </select>
                  </Field>

                  <Field label="Actividad sexual">
                    <select
                      className={inputCls}
                      value={sexualActivity}
                      onChange={(e) => setSexualActivity(e.target.value as SexualActivity)}
                    >
                      <option value="no">No</option>
                      <option value="yes">Sí</option>
                    </select>
                  </Field>

                  {sex === "F" && (
                    <Field label="Embarazo (si aplica)">
                      <select
                        className={inputCls}
                        value={pregnancy}
                        onChange={(e) => setPregnancy(e.target.value as Pregnancy)}
                      >
                        <option value="no">No</option>
                        <option value="yes">Sí</option>
                        <option value="unknown">No estoy segura</option>
                      </select>
                    </Field>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
                <p className="text-sm font-semibold text-rose-900">No usar en urgencias</p>
                <p className="mt-2 text-sm leading-6 text-rose-800">
                  Si tienes síntomas de alarma, este flujo no reemplaza evaluación médica directa.
                </p>
              </div>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Vista previa
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              2. Recomendación preliminar
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{rec.summary}</p>

            <div className="mt-6 rounded-3xl bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Exámenes sugeridos hoy
              </p>
              <div className="mt-4 grid gap-3">
                {rec.tests.map((t) => (
                  <div key={t.name} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{t.why}</p>
                  </div>
                ))}
              </div>
            </div>

            {rec.notes.length > 0 && (
              <div className="mt-6 rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Notas clínicas</p>
                <ul className="mt-3 grid gap-2 text-sm text-slate-700">
                  {rec.notes.map((n, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={handleContinue}
              disabled={isSubmitting}
              className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Creando solicitud..." : "Continuar a la ficha de orden"}
            </button>

            {submitError && (
              <p className="mt-3 text-xs leading-5 text-rose-600">{submitError}</p>
            )}

            <p className="mt-3 text-xs leading-5 text-slate-500">
              La orden se emite después del pago y de la validación clínica correspondiente.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200";
