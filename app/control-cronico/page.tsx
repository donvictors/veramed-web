"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import Stepper from "@/components/checkup/Stepper";
import { fetchCurrentUser } from "@/lib/auth-api";
import { createChronicControlRequest } from "@/lib/chronic-control-api";
import {
  calculateAgeFromBirthDate,
  calculateBodyMassIndex,
  calculatePackYearIndex,
  joinPatientFullName,
  type CheckupInput,
  type DietaryPattern,
  type DietaryRestriction,
  type PatientDetails,
  type PatientNameFields,
  type Pregnancy,
  type Sex,
  type SexualActivity,
  type Smoking,
  splitPatientFullName,
} from "@/lib/checkup";
import {
  ANTIEPILEPTIC_OPTIONS,
  CONDITION_OPTIONS,
  MEDICATION_OPTIONS,
  antiepilepticLabel,
  conditionLabel,
  medicationLabel,
  recommendMultipleChronicControls,
  type AntiepilepticOption,
  type ChronicCondition,
  type MedicationOption,
} from "@/lib/chronic-control";

export default function ChronicControlPage() {
  const recommendationCardRef = useRef<HTMLDivElement>(null);
  const [conditions, setConditions] = useState<ChronicCondition[]>(["hypertension"]);
  const [showAllConditions, setShowAllConditions] = useState(false);
  const [nameFields, setNameFields] = useState<PatientNameFields>({
    firstName: "",
    paternalSurname: "",
    maternalSurname: "",
  });
  const [rut, setRut] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [yearsSinceDiagnosis, setYearsSinceDiagnosis] = useState(3);
  const [hasRecentChanges, setHasRecentChanges] = useState(false);
  const [usesMedication, setUsesMedication] = useState(false);
  const [selectedMedications, setSelectedMedications] = useState<MedicationOption[]>([]);
  const [selectedAntiepileptics, setSelectedAntiepileptics] = useState<AntiepilepticOption[]>([]);
  const [includeGeneralCheckup, setIncludeGeneralCheckup] = useState(false);
  const [checkupSex, setCheckupSex] = useState<Sex>("M");
  const [checkupWeightKg, setCheckupWeightKg] = useState(75);
  const [checkupHeightCm, setCheckupHeightCm] = useState(175);
  const [checkupSmoking, setCheckupSmoking] = useState<Smoking>("never");
  const [checkupCigarettesPerDay, setCheckupCigarettesPerDay] = useState(0);
  const [checkupSmokingYears, setCheckupSmokingYears] = useState(0);
  const [checkupQuitSmokingYearsAgo, setCheckupQuitSmokingYearsAgo] = useState(0);
  const [checkupDietaryRestriction, setCheckupDietaryRestriction] =
    useState<DietaryRestriction>("none");
  const [checkupDietaryPatterns, setCheckupDietaryPatterns] = useState<DietaryPattern[]>([]);
  const [checkupSexualActivity, setCheckupSexualActivity] = useState<SexualActivity>("no");
  const [checkupPregnancy, setCheckupPregnancy] = useState<Pregnancy>("no");
  const [checkupGestationWeeks, setCheckupGestationWeeks] = useState(0);
  const [highlightRecommendation, setHighlightRecommendation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const patient: PatientDetails = useMemo(
    () => ({
      fullName: joinPatientFullName(nameFields),
      rut,
      birthDate,
      email,
      phone,
      address,
    }),
    [address, birthDate, email, nameFields, phone, rut],
  );

  const patientAge = useMemo(() => calculateAgeFromBirthDate(birthDate), [birthDate]);
  const checkupBodyMassIndex = useMemo(
    () => calculateBodyMassIndex(checkupWeightKg, checkupHeightCm),
    [checkupHeightCm, checkupWeightKg],
  );
  const checkupPackYearIndex = useMemo(
    () => calculatePackYearIndex(checkupCigarettesPerDay, checkupSmokingYears),
    [checkupCigarettesPerDay, checkupSmokingYears],
  );
  const checkupInput: CheckupInput = useMemo(
    () => ({
      age: patientAge,
      sex: checkupSex,
      weightKg: checkupWeightKg,
      heightCm: checkupHeightCm,
      bodyMassIndex: checkupBodyMassIndex,
      smoking: checkupSmoking,
      cigarettesPerDay: checkupSmoking === "never" ? 0 : checkupCigarettesPerDay,
      smokingYears: checkupSmoking === "never" ? 0 : checkupSmokingYears,
      packYearIndex: checkupSmoking === "never" ? 0 : checkupPackYearIndex,
      quitSmokingYearsAgo: checkupSmoking === "former" ? checkupQuitSmokingYearsAgo : 0,
      sexualActivity: checkupSexualActivity,
      pregnancy: checkupPregnancy,
      gestationWeeks: checkupPregnancy === "yes" ? checkupGestationWeeks : 0,
      dietaryRestriction: checkupDietaryRestriction,
      dietaryPatterns: checkupDietaryRestriction === "special" ? checkupDietaryPatterns : [],
    }),
    [
      checkupBodyMassIndex,
      checkupCigarettesPerDay,
      checkupDietaryPatterns,
      checkupDietaryRestriction,
      checkupGestationWeeks,
      checkupHeightCm,
      checkupPackYearIndex,
      checkupPregnancy,
      checkupQuitSmokingYearsAgo,
      checkupSex,
      checkupSexualActivity,
      checkupSmoking,
      checkupSmokingYears,
      checkupWeightKg,
      patientAge,
    ],
  );

  const rec = useMemo(
    () =>
      recommendMultipleChronicControls(
        conditions,
        hasRecentChanges,
        usesMedication,
        selectedMedications,
        selectedAntiepileptics,
        includeGeneralCheckup ? checkupInput : undefined,
      ),
    [
      conditions,
      hasRecentChanges,
      selectedAntiepileptics,
      selectedMedications,
      usesMedication,
      includeGeneralCheckup,
      checkupInput,
    ],
  );
  const visibleConditionOptions = useMemo(
    () => (showAllConditions ? CONDITION_OPTIONS : CONDITION_OPTIONS.slice(0, 6)),
    [showAllConditions],
  );
  const selectZeroValueOnFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    const currentValue = event.currentTarget.value.trim();
    if (currentValue === "0" || currentValue === "0.0" || currentValue === "0,0") {
      event.currentTarget.select();
    }
  };

  useEffect(() => {
    void fetchCurrentUser()
      .then((response) => {
        if (!response.user) {
          return;
        }

        const profileName = response.user.profile.fullName || response.user.name || "";
        const parsedName = splitPatientFullName(profileName);

        startTransition(() => {
          setNameFields((current) => ({
            firstName: current.firstName || parsedName.firstName,
            paternalSurname: current.paternalSurname || parsedName.paternalSurname,
            maternalSurname: current.maternalSurname || parsedName.maternalSurname,
          }));
          setRut((current) => current || response.user?.profile.rut || "");
          setBirthDate((current) => current || response.user?.profile.birthDate || "");
          setEmail((current) => current || response.user?.profile.email || response.user?.email || "");
          setPhone((current) => current || response.user?.profile.phone || "");
          setAddress((current) => current || response.user?.profile.address || "");
        });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (checkupSex === "M") {
      setCheckupPregnancy("no");
      setCheckupGestationWeeks(0);
    }
  }, [checkupSex]);

  useEffect(() => {
    if (checkupSmoking === "never") {
      setCheckupCigarettesPerDay(0);
      setCheckupSmokingYears(0);
      setCheckupQuitSmokingYearsAgo(0);
    }

    if (checkupSmoking === "current") {
      setCheckupQuitSmokingYearsAgo(0);
    }
  }, [checkupSmoking]);

  useEffect(() => {
    if (checkupPregnancy === "no") {
      setCheckupGestationWeeks(0);
    }
  }, [checkupPregnancy]);

  useEffect(() => {
    if (checkupDietaryRestriction === "none") {
      setCheckupDietaryPatterns([]);
    }
  }, [checkupDietaryRestriction]);

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
    setSelectedMedications((current) => {
      if (current.includes(medication)) {
        if (medication === "antiepileptics") {
          setSelectedAntiepileptics([]);
        }
        return current.filter((item) => item !== medication);
      }

      return [...current, medication];
    });
  }

  function toggleAntiepileptic(option: AntiepilepticOption) {
    setSelectedAntiepileptics((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    );
  }

  function toggleCheckupDietaryPattern(pattern: DietaryPattern) {
    setCheckupDietaryPatterns((current) =>
      current.includes(pattern) ? current.filter((item) => item !== pattern) : [...current, pattern],
    );
  }

  function focusRecommendationPanel() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    recommendationCardRef.current?.focus({ preventScroll: true });
    setHighlightRecommendation(true);
    window.setTimeout(() => setHighlightRecommendation(false), 1600);
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
        selectedAntiepileptics,
        includeGeneralCheckup,
        generalCheckupInput: includeGeneralCheckup ? checkupInput : undefined,
      });

      window.location.href = `/control-cronico/resumen?id=${request.id}`;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No pudimos crear tu solicitud.");
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
            Exámenes de control <br /> para tu enfermedad o condición crónica.
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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Información inicial
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              1. Completa tus datos acá
            </h2>
            <div className="grid gap-6">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">1. Datos del paciente</p>
                <p className="mt-1 text-sm text-slate-600">
                  Completa los datos de la persona para generar la orden de control.
                </p>

                <div className="mt-5 grid gap-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Nombre">
                      <input
                        className={inputCls}
                        value={nameFields.firstName}
                        onChange={(e) =>
                          setNameFields((current) => ({ ...current, firstName: e.target.value }))
                        }
                      />
                    </Field>

                    <Field label="Apellido paterno">
                      <input
                        className={inputCls}
                        value={nameFields.paternalSurname}
                        onChange={(e) =>
                          setNameFields((current) => ({
                            ...current,
                            paternalSurname: e.target.value,
                          }))
                        }
                      />
                    </Field>

                    <Field label="Apellido materno">
                      <input
                        className={inputCls}
                        value={nameFields.maternalSurname}
                        onChange={(e) =>
                          setNameFields((current) => ({
                            ...current,
                            maternalSurname: e.target.value,
                          }))
                        }
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="RUT">
                      <input className={inputCls} value={rut} onChange={(e) => setRut(e.target.value)} />
                    </Field>
                    <Field label="Fecha de nacimiento">
                      <input
                        className={inputCls}
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Correo electrónico">
                      <input
                        className={inputCls}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </Field>
                    <Field label="Teléfono">
                      <input
                        className={inputCls}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </Field>
                  </div>

                  <Field label="Dirección">
                    <input
                      className={inputCls}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </Field>

                </div>
              </div>

              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">2. Condiciones a controlar</p>
                <p className="mt-1 text-sm text-slate-600">
                  Selecciona la o las condiciones que quieres controlar.
                </p>

                <div className="mt-5 grid gap-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    {visibleConditionOptions.map((condition) => {
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

                  {!showAllConditions && CONDITION_OPTIONS.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setShowAllConditions(true)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Mostrar más enfermedades ↓
                    </button>
                  )}

                  {showAllConditions && CONDITION_OPTIONS.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setShowAllConditions(false)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Mostrar menos enfermedades ↑
                    </button>
                  )}

                  <Field label="Años desde el diagnóstico">
                    <input
                      className={inputCls}
                      type="number"
                      min={0}
                      max={60}
                      value={yearsSinceDiagnosis}
                      onFocus={selectZeroValueOnFocus}
                      onChange={(e) => setYearsSinceDiagnosis(Number(e.target.value))}
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">3. Contexto del control</p>
                <p className="mt-1 text-sm text-slate-600">
                  Estos antecedentes nos ayudan a decidir si debemos ampliar tu control de
                  exámenes.
                </p>

                <div className="mt-5 grid gap-5">
                  <Field label="¿Usas algún medicamento actualmente?">
                    <select
                      className={inputCls}
                      value={usesMedication ? "yes" : "no"}
                      onChange={(e) => {
                        const nextUsesMedication = e.target.value === "yes";
                        setUsesMedication(nextUsesMedication);
                        if (!nextUsesMedication) {
                          setSelectedMedications([]);
                          setSelectedAntiepileptics([]);
                        }
                      }}
                    >
                      <option value="no">No</option>
                      <option value="yes">Sí</option>
                    </select>
                  </Field>

                  {usesMedication && (
                    <div className="grid gap-3">
                      <span className="text-sm font-medium">¿Cuáles tratamientos usa?</span>
                      <div className="grid gap-3">
                        {MEDICATION_OPTIONS.map((medication) => {
                          const selected = selectedMedications.includes(medication);
                          const isAntiepileptics = medication === "antiepileptics";
                          const tooltip =
                            medication === "corticosteroids"
                              ? "Ej: Prednisona, hidrocortisona, metilprednisolona, etc."
                              : medication === "immunosuppressants"
                                ? "Ej: Metotrexato, Azatioprina, Ciclosporina, Tacrolimus, Terapias biológicas, etc."
                                : "";

                          return (
                            <div key={medication} className="grid gap-3">
                              <label
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
                                <span className="flex items-center gap-2 text-sm font-medium">
                                  {medicationLabel(medication)}
                                  {tooltip ? <InlineTooltip text={tooltip} active={selected} /> : null}
                                </span>
                              </label>

                              {isAntiepileptics && selected && (
                                <div className="ml-4 grid gap-2 rounded-2xl border border-slate-200 bg-white p-4">
                                  {ANTIEPILEPTIC_OPTIONS.map((option) => {
                                    const antiSelected = selectedAntiepileptics.includes(option);

                                    return (
                                      <label
                                        key={option}
                                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-900 transition hover:border-slate-300"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={antiSelected}
                                          onChange={() => toggleAntiepileptic(option)}
                                          className="mt-0.5"
                                        />
                                        <span>{antiepilepticLabel(option)}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
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

              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">
                  4. ¿Deseas agregar exámenes de chequeo general?{" "}
                  <span className="font-medium text-slate-400">+$1.000</span>
                </p>

                <div className="mt-4 grid gap-4">
                  <Field label="Agregar chequeo general">
                    <select
                      className={inputCls}
                      value={includeGeneralCheckup ? "yes" : "no"}
                      onChange={(e) => setIncludeGeneralCheckup(e.target.value === "yes")}
                    >
                      <option value="no">No</option>
                      <option value="yes">Sí</option>
                    </select>
                  </Field>

                  {includeGeneralCheckup && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs text-slate-600">
                        Llena estos datos para definir tus exámenes de chequeo general.
                      </p>

                      <div className="mt-4 grid gap-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <Field label="Edad">
                            <input
                              className={smallReadonlyCls}
                              value={patientAge > 0 ? String(patientAge) : ""}
                              readOnly
                            />
                          </Field>
                          <Field label="Sexo (biológico)">
                            <select
                              className={smallInputCls}
                              value={checkupSex}
                              onChange={(e) => setCheckupSex(e.target.value as Sex)}
                            >
                              <option value="M">Masculino</option>
                              <option value="F">Femenino</option>
                            </select>
                          </Field>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <Field label="Peso (kg)">
                            <input
                              className={smallInputCls}
                              type="number"
                              min={0}
                              step="0.1"
                              value={checkupWeightKg}
                              onFocus={selectZeroValueOnFocus}
                              onChange={(e) => setCheckupWeightKg(Number(e.target.value))}
                            />
                          </Field>
                          <Field label="Talla (cm)">
                            <input
                              className={smallInputCls}
                              type="number"
                              min={0}
                              value={checkupHeightCm}
                              onFocus={selectZeroValueOnFocus}
                              onChange={(e) => setCheckupHeightCm(Number(e.target.value))}
                            />
                          </Field>
                        </div>

                        <Field label="IMC">
                          <input
                            className={smallReadonlyCls}
                            value={
                              checkupBodyMassIndex > 0
                                ? checkupBodyMassIndex.toFixed(1)
                                : ""
                            }
                            readOnly
                          />
                        </Field>

                        <Field label="Tabaco">
                          <select
                            className={smallInputCls}
                            value={checkupSmoking}
                            onChange={(e) => setCheckupSmoking(e.target.value as Smoking)}
                          >
                            <option value="never">Nunca</option>
                            <option value="former">Ex-fumador</option>
                            <option value="current">Fumador actual</option>
                          </select>
                        </Field>

                        {(checkupSmoking === "former" || checkupSmoking === "current") && (
                          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Detalle de tabaquismo
                            </p>
                            <div className="grid gap-3 md:grid-cols-2">
                            {checkupSmoking === "former" && (
                              <SmallField label="¿Hace cuántos años dejaste de fumar?">
                                <input
                                  className={smallInputCls}
                                  type="number"
                                  min={0}
                                  max={99}
                                  value={checkupQuitSmokingYearsAgo}
                                  onFocus={selectZeroValueOnFocus}
                                  onChange={(e) => setCheckupQuitSmokingYearsAgo(Number(e.target.value))}
                                />
                              </SmallField>
                            )}
                            <SmallField
                              label={
                                checkupSmoking === "former"
                                  ? "Cigarros/día promedio durante el período fumado"
                                  : "Cigarros/día promedio"
                              }
                            >
                              <input
                                className={smallInputCls}
                                type="number"
                                min={0}
                                value={checkupCigarettesPerDay}
                                onFocus={selectZeroValueOnFocus}
                                onChange={(e) => setCheckupCigarettesPerDay(Number(e.target.value))}
                              />
                            </SmallField>
                            <SmallField label="Años fumando">
                              <input
                                className={smallInputCls}
                                type="number"
                                min={0}
                                value={checkupSmokingYears}
                                onFocus={selectZeroValueOnFocus}
                                onChange={(e) => setCheckupSmokingYears(Number(e.target.value))}
                              />
                            </SmallField>
                            </div>
                          </div>
                        )}

                        <Field label="¿Sigues alguna dieta especial o tienes alguna restricción alimentaria?">
                          <select
                            className={smallInputCls}
                            value={checkupDietaryRestriction}
                            onChange={(e) =>
                              setCheckupDietaryRestriction(e.target.value as DietaryRestriction)
                            }
                          >
                            <option value="none">Ninguna</option>
                            <option value="special">Sí</option>
                          </select>
                        </Field>

                        {checkupDietaryRestriction === "special" && (
                          <div className="grid gap-2 md:grid-cols-2">
                            {[
                              { value: "vegan", label: "Vegana" },
                              { value: "vegetarian", label: "Vegetaria" },
                              { value: "ketogenic", label: "Cetogénica" },
                              { value: "gluten_free", label: "Libre de gluten" },
                            ].map((pattern) => (
                              <label
                                key={pattern.value}
                                className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                              >
                                <input
                                  type="checkbox"
                                  checked={checkupDietaryPatterns.includes(
                                    pattern.value as DietaryPattern,
                                  )}
                                  onChange={() =>
                                    toggleCheckupDietaryPattern(pattern.value as DietaryPattern)
                                  }
                                  className="mt-0.5"
                                />
                                <span>{pattern.label}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        <Field label="¿Eres sexualmente activo?">
                          <select
                            className={smallInputCls}
                            value={checkupSexualActivity}
                            onChange={(e) => setCheckupSexualActivity(e.target.value as SexualActivity)}
                          >
                            <option value="no">No</option>
                            <option value="yes">Sí</option>
                          </select>
                        </Field>

                        <Field label="¿Estás embarazada?">
                          <select
                            className={smallInputCls}
                            value={checkupPregnancy}
                            onChange={(e) => setCheckupPregnancy(e.target.value as Pregnancy)}
                            disabled={checkupSex !== "F"}
                          >
                            <option value="no">No</option>
                            <option value="yes">Sí</option>
                          </select>
                        </Field>

                        {checkupPregnancy === "yes" && (
                          <Field label="¿Cuántas semanas tienes de gestación?">
                            <input
                              className={smallInputCls}
                              type="number"
                              min={0}
                              max={41}
                              value={checkupGestationWeeks}
                              onFocus={selectZeroValueOnFocus}
                              onChange={(e) => setCheckupGestationWeeks(Number(e.target.value))}
                            />
                          </Field>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={focusRecommendationPanel}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_6px_18px_-14px_rgba(15,23,42,0.65)] transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Continuar
                </button>
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

          <aside
            ref={recommendationCardRef}
            tabIndex={-1}
            className={`rounded-[2rem] border bg-white p-6 transition ${
              highlightRecommendation
                ? "border-slate-400 shadow-[0_22px_70px_-34px_rgba(15,23,42,0.55)] ring-2 ring-slate-200"
                : "border-slate-200"
            }`}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Vista previa
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              2. Recomendación preliminar
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{rec.summary}</p>

            <div className="mt-6 rounded-3xl bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Datos para la orden
              </p>
              <div className="mt-4 grid gap-3 text-sm text-slate-700">
                <p>
                  <span className="font-medium text-slate-900">Paciente:</span>{" "}
                  {patient.fullName || "Sin completar"}
                </p>
                <p>
                  <span className="font-medium text-slate-900">RUT:</span> {patient.rut || "Sin completar"}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Exámenes sugeridos hoy
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
                  <span>Tratamiento actual: {usesMedication ? "sí" : "no"}.</span>
                </li>
                {usesMedication && selectedMedications.length > 0 && (
                  <li className="flex gap-2">
                    <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>
                      Tratamientos seleccionados: {selectedMedications.map(medicationLabel).join(", ")}.
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

            {submitError && <p className="mt-3 text-xs leading-5 text-rose-600">{submitError}</p>}

            <p className="mt-3 text-xs leading-5 text-slate-500">
              En la siguiente página podrás modificar y personalizar la orden. Se emite después
              del pago y validación médica.
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

function SmallField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function InlineTooltip({ text, active }: { text: string; active: boolean }) {
  return (
    <span className="group relative inline-flex items-center">
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
          active
            ? "border border-white/60 text-white/90"
            : "border border-slate-300 text-slate-500"
        }`}
      >
        ?
      </span>
      <span
        className={`pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-xl px-3 py-2 text-xs font-normal leading-5 shadow-lg opacity-0 transition group-hover:opacity-100 ${
          active ? "bg-slate-900 text-white" : "bg-white text-slate-700"
        }`}
      >
        {text}
      </span>
    </span>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

const smallInputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";

const smallReadonlyCls =
  "w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-600 outline-none";
