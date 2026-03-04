"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Stepper from "@/components/checkup/Stepper";
import { fetchCurrentUser } from "@/lib/auth-api";
import { createChronicControlRequest } from "@/lib/chronic-control-api";
import { type PatientDetails } from "@/lib/checkup";
import {
  CONDITION_OPTIONS,
  MEDICATION_OPTIONS,
  conditionLabel,
  medicationLabel,
  recommendMultipleChronicControls,
  type ChronicCondition,
  type MedicationOption,
} from "@/lib/chronic-control";

export default function ChronicControlPage() {
  const [conditions, setConditions] = useState<ChronicCondition[]>(["hypertension"]);
  const [patient, setPatient] = useState<PatientDetails>({
    fullName: "",
    rut: "",
    birthDate: "",
    email: "",
    phone: "",
    address: "",
  });
  const [yearsSinceDiagnosis, setYearsSinceDiagnosis] = useState(3);
  const [hasRecentChanges, setHasRecentChanges] = useState(false);
  const [usesMedication, setUsesMedication] = useState(true);
  const [selectedMedications, setSelectedMedications] = useState<MedicationOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const rec = useMemo(
    () =>
      recommendMultipleChronicControls(
        conditions,
        hasRecentChanges,
        usesMedication,
        selectedMedications,
      ),
    [conditions, hasRecentChanges, selectedMedications, usesMedication],
  );

  useEffect(() => {
    void fetchCurrentUser()
      .then((response) => {
        if (!response.user) {
          return;
        }

        startTransition(() => {
          setPatient((current) => ({
            fullName: current.fullName || response.user?.profile.fullName || response.user?.name || "",
            rut: current.rut || response.user?.profile.rut || "",
            birthDate: current.birthDate || response.user?.profile.birthDate || "",
            email: current.email || response.user?.profile.email || response.user?.email || "",
            phone: current.phone || response.user?.profile.phone || "",
            address: current.address || response.user?.profile.address || "",
          }));
        });
      })
      .catch(() => undefined);
  }, []);

  function toggleCondition(condition: ChronicCondition) {
    setConditions((current) => {
      if (current.includes(condition)) {
        const next = current.filter((item) => item !== condition);
        return next.length > 0 ? next : current;
      }

      return [...current, condition];
    });
  }

  function toggleMedication(medication: MedicationOption) {
    setSelectedMedications((current) =>
      current.includes(medication)
        ? current.filter((item) => item !== medication)
        : [...current, medication],
    );
  }

  async function continueToSummary() {
    try {
      setIsSubmitting(true);
      setSubmitError("");

      const request = await createChronicControlRequest({
        conditions,
        patient,
        yearsSinceDiagnosis,
        hasRecentChanges,
        usesMedication,
        selectedMedications,
      });

      window.location.href = `/control-cronico/resumen?id=${request.id}`;
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
            Control crónico
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Exámenes de control por enfermedad o condición crónica.
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Indica la condición que quieres controlar y recibe una recomendación estructurada de
            exámenes para seguimiento periódico, con orientación clínica clara y ordenable.
          </p>
        </div>

        <div className="mt-8">
          <Stepper currentStep={1} />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
            <div className="grid gap-6">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">1. Datos del paciente y condición principal</p>
                <p className="mt-1 text-sm text-slate-600">
                  Completa los datos de la persona y selecciona la condición que requiere control periódico.
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

                  <div className="grid gap-3">
                    <span className="text-sm font-medium">Condiciones a controlar</span>
                    <div className="grid gap-3 md:grid-cols-2">
                      {CONDITION_OPTIONS.map((condition) => {
                        const selected = conditions.includes(condition);

                        return (
                          <label
                            key={condition}
                            className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                              selected
                                ? "border-slate-950 bg-slate-950 text-white"
                                : "border-slate-200 bg-white text-slate-900"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleCondition(condition)}
                              className="mt-1"
                            />
                            <span className="text-sm font-medium">{conditionLabel(condition)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <Field label="Años desde el diagnóstico">
                    <input
                      className={inputCls}
                      type="number"
                      min={0}
                      max={60}
                      value={yearsSinceDiagnosis}
                      onChange={(e) => setYearsSinceDiagnosis(Number(e.target.value))}
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">2. Contexto del control</p>
                <p className="mt-1 text-sm text-slate-600">
                  Estos antecedentes ayudan a orientar si el control debe ampliarse.
                </p>

                <div className="mt-5 grid gap-5">
                  <Field label="¿Usa tratamiento actualmente?">
                    <select
                      className={inputCls}
                      value={usesMedication ? "yes" : "no"}
                      onChange={(e) => {
                        const nextUsesMedication = e.target.value === "yes";
                        setUsesMedication(nextUsesMedication);
                        if (!nextUsesMedication) {
                          setSelectedMedications([]);
                        }
                      }}
                    >
                      <option value="yes">Sí</option>
                      <option value="no">No</option>
                    </select>
                  </Field>

                  {usesMedication && (
                    <div className="grid gap-3">
                      <span className="text-sm font-medium">¿Cuáles tratamientos usa?</span>
                      <div className="grid gap-3">
                        {MEDICATION_OPTIONS.map((medication) => {
                          const selected = selectedMedications.includes(medication);

                          return (
                            <label
                              key={medication}
                              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                                selected
                                  ? "border-slate-950 bg-slate-950 text-white"
                                  : "border-slate-200 bg-white text-slate-900"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleMedication(medication)}
                                className="mt-1"
                              />
                              <span className="text-sm font-medium">
                                {medicationLabel(medication)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <Field label="¿Hubo cambios recientes en síntomas o tratamiento?">
                    <select
                      className={inputCls}
                      value={hasRecentChanges ? "yes" : "no"}
                      onChange={(e) => setHasRecentChanges(e.target.value === "yes")}
                    >
                      <option value="no">No</option>
                      <option value="yes">Sí</option>
                    </select>
                  </Field>
                </div>
              </div>

              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
                <p className="text-sm font-semibold text-rose-900">Importante</p>
                <p className="mt-2 text-sm leading-6 text-rose-800">
                  Si existe descompensación, síntomas de alarma o necesidad de ajuste urgente de
                  tratamiento, corresponde evaluación médica directa.
                </p>
              </div>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Recomendación
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Control para{" "}
              {conditions.map(conditionLabel).join(", ")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{rec.summary}</p>

            <div className="mt-6 rounded-3xl bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Exámenes sugeridos
              </p>
              <div className="mt-4 grid gap-3">
                {rec.tests.map((test) => (
                  <div key={test.name} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">{test.name}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{test.why}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Consideraciones</p>
              <ul className="mt-3 grid gap-2 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>
                    Tiempo de evolución declarado: {yearsSinceDiagnosis}{" "}
                    {yearsSinceDiagnosis === 1 ? "año" : "años"}.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  <span>
                    Tratamiento actual: {usesMedication ? "sí" : "no"}.
                  </span>
                </li>
                {usesMedication && selectedMedications.length > 0 && (
                  <li className="flex gap-2">
                    <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>
                      Tratamientos seleccionados:{" "}
                      {selectedMedications.map(medicationLabel).join(", ")}.
                    </span>
                  </li>
                )}
                {rec.notes.map((note) => (
                  <li key={note} className="flex gap-2">
                    <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={continueToSummary}
              disabled={isSubmitting}
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Creando solicitud..." : "Continuar al resumen"}
            </button>

            {submitError && (
              <p className="mt-3 text-xs leading-5 text-rose-600">{submitError}</p>
            )}

            <p className="mt-3 text-xs leading-5 text-slate-500">
              Revisa el detalle consolidado antes de continuar al pago y emitir la orden.
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

const inputCls =
  "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
