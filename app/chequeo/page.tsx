"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import Stepper from "@/components/checkup/Stepper";
import { fetchCurrentUser } from "@/lib/auth-api";
import { createCheckupRequest } from "@/lib/checkup-api";
import {
  calculateAgeFromBirthDate,
  calculateBodyMassIndex,
  calculatePackYearIndex,
  formatRut,
  isValidRut,
  normalizeRut,
  type CheckupInput,
  type DietaryPattern,
  type DietaryRestriction,
  joinPatientFullName,
  type PatientDetails,
  type PatientNameFields,
  type Pregnancy,
  type Sex,
  type SexualActivity,
  type Smoking,
  recommend,
  splitPatientFullName,
} from "@/lib/checkup";

export default function CheckupPage() {
  const recommendationCardRef = useRef<HTMLDivElement>(null);
  const [nameFields, setNameFields] = useState<PatientNameFields>({
    firstName: "",
    paternalSurname: "",
    maternalSurname: "",
  });
  const [rut, setRut] = useState("");
  const [rutNormalized, setRutNormalized] = useState("");
  const [rutTouched, setRutTouched] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [sex, setSex] = useState<Sex>("M");
  const [weightKg, setWeightKg] = useState(75);
  const [heightCm, setHeightCm] = useState(175);
  const [smoking, setSmoking] = useState<Smoking>("never");
  const [cigarettesPerDay, setCigarettesPerDay] = useState(0);
  const [smokingYears, setSmokingYears] = useState(0);
  const [quitSmokingYearsAgo, setQuitSmokingYearsAgo] = useState(0);
  const [dietaryRestriction, setDietaryRestriction] = useState<DietaryRestriction>("none");
  const [dietaryPatterns, setDietaryPatterns] = useState<DietaryPattern[]>([]);
  const [sexualActivity, setSexualActivity] = useState<SexualActivity>("no");
  const [pregnancy, setPregnancy] = useState<Pregnancy>("no");
  const [gestationWeeks, setGestationWeeks] = useState(0);
  const [highlightRecommendation, setHighlightRecommendation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const rutInputRef = useRef<HTMLInputElement>(null);

  const age = useMemo(() => calculateAgeFromBirthDate(birthDate), [birthDate]);
  const bodyMassIndex = useMemo(
    () => calculateBodyMassIndex(weightKg, heightCm),
    [heightCm, weightKg],
  );
  const packYearIndex = useMemo(
    () => calculatePackYearIndex(cigarettesPerDay, smokingYears),
    [cigarettesPerDay, smokingYears],
  );

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

  const input: CheckupInput = useMemo(
    () => ({
      age,
      sex,
      weightKg,
      heightCm,
      bodyMassIndex,
      smoking,
      cigarettesPerDay: smoking === "never" ? 0 : cigarettesPerDay,
      smokingYears: smoking === "never" ? 0 : smokingYears,
      packYearIndex: smoking === "never" ? 0 : packYearIndex,
      quitSmokingYearsAgo: smoking === "former" ? quitSmokingYearsAgo : 0,
      dietaryRestriction,
      dietaryPatterns: dietaryRestriction === "special" ? dietaryPatterns : [],
      sexualActivity,
      pregnancy,
      gestationWeeks: pregnancy === "yes" ? gestationWeeks : 0,
    }),
    [
      age,
      bodyMassIndex,
      cigarettesPerDay,
      heightCm,
      packYearIndex,
      pregnancy,
      gestationWeeks,
      quitSmokingYearsAgo,
      dietaryRestriction,
      dietaryPatterns,
      sex,
      sexualActivity,
      smoking,
      smokingYears,
      weightKg,
    ],
  );

  const rec = useMemo(() => recommend(input), [input]);
  const hasEnoughRutInput = rutNormalized.length >= 8;
  const rutIsValid = rutNormalized ? isValidRut(rutNormalized) : false;
  const showRutInvalid = Boolean(rutNormalized) && (rutTouched || hasEnoughRutInput) && !rutIsValid;
  const missingRequiredFields = useMemo(() => {
    const missing: string[] = [];

    if (!nameFields.firstName.trim()) missing.push("Nombre");
    if (!nameFields.paternalSurname.trim()) missing.push("Apellido paterno");
    if (!nameFields.maternalSurname.trim()) missing.push("Apellido materno");
    if (!rut.trim()) missing.push("RUT");
    if (!birthDate) missing.push("Fecha de nacimiento");

    return missing;
  }, [birthDate, nameFields, rut]);
  const hasMissingRequiredFields = missingRequiredFields.length > 0;

  useEffect(() => {
    if (sex === "M") {
      setPregnancy("no");
      setGestationWeeks(0);
    }
  }, [sex]);

  useEffect(() => {
    if (smoking === "never") {
      setCigarettesPerDay(0);
      setSmokingYears(0);
      setQuitSmokingYearsAgo(0);
    }

    if (smoking === "current") {
      setQuitSmokingYearsAgo(0);
    }
  }, [smoking]);

  useEffect(() => {
    if (pregnancy === "no") {
      setGestationWeeks(0);
    }
  }, [pregnancy]);

  useEffect(() => {
    if (dietaryRestriction === "none") {
      setDietaryPatterns([]);
    }
  }, [dietaryRestriction]);

  useEffect(() => {
    if (
      !hasMissingRequiredFields &&
      submitError.startsWith("Completa los campos obligatorios antes de continuar:")
    ) {
      setSubmitError("");
    }
  }, [hasMissingRequiredFields, submitError]);

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
          const profileRut = response.user?.profile.rut || "";
          const normalizedProfileRut = normalizeRut(profileRut);
          setRut((current) => current || formatRut(profileRut));
          setRutNormalized((current) => current || normalizedProfileRut);
          setBirthDate((current) => current || response.user?.profile.birthDate || "");
          setEmail((current) => current || response.user?.profile.email || response.user?.email || "");
          setPhone((current) => current || response.user?.profile.phone || "");
          setAddress((current) => current || response.user?.profile.address || "");
        });
      })
      .catch(() => undefined);
  }, []);

  async function handleContinue() {
    if (hasMissingRequiredFields) {
      setSubmitError(
        `Completa los campos obligatorios antes de continuar: ${missingRequiredFields.join(", ")}.`,
      );
      return;
    }

    if (!rutIsValid) {
      setRutTouched(true);
      setSubmitError("Ingresa un RUT válido para continuar.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError("");

      const checkup = await createCheckupRequest({ input, patient });
      window.location.href = `/chequeo/resumen?id=${checkup.id}`;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No pudimos crear tu solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function focusRecommendationPanel() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    recommendationCardRef.current?.focus({ preventScroll: true });
    setHighlightRecommendation(true);
    window.setTimeout(() => setHighlightRecommendation(false), 1600);
  }

  const showsSmokingIntensity = smoking === "former" || smoking === "current";
  const showsDietaryOptions = dietaryRestriction === "special";
  const showsPregnancyWeeks = pregnancy === "yes";
  const gestationWarning = gestationWeeks >= 42;
  const underageWarning = Boolean(birthDate) && age < 15;
  const selectZeroValueOnFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    const currentValue = event.currentTarget.value.trim();
    if (currentValue === "0" || currentValue === "0.0" || currentValue === "0,0") {
      event.currentTarget.select();
    }
  };

  function calculateCaretPosition(formattedValue: string, normalizedLengthBeforeCaret: number) {
    if (normalizedLengthBeforeCaret <= 0) return 0;

    let seen = 0;
    for (let i = 0; i < formattedValue.length; i += 1) {
      if (/[\dK]/.test(formattedValue[i])) {
        seen += 1;
      }
      if (seen >= normalizedLengthBeforeCaret) {
        return i + 1;
      }
    }

    return formattedValue.length;
  }

  function handleRutChange(nextRawValue: string, caretPos: number | null) {
    const normalized = normalizeRut(nextRawValue);
    const formatted = formatRut(normalized);

    let nextCaretPosition = formatted.length;
    if (caretPos !== null) {
      const normalizedBeforeCaret = normalizeRut(nextRawValue.slice(0, caretPos));
      nextCaretPosition = calculateCaretPosition(formatted, normalizedBeforeCaret.length);
    }

    setRut(formatted);
    setRutNormalized(normalized);

    window.requestAnimationFrame(() => {
      if (!rutInputRef.current) return;
      rutInputRef.current.setSelectionRange(nextCaretPosition, nextCaretPosition);
    });
  }

  function normalizeBirthDateInput(nextValue: string) {
    const parts = nextValue.split("-");
    if (parts.length !== 3) {
      return nextValue;
    }

    const [year, month, day] = parts;
    if (year.length <= 4) {
      return nextValue;
    }

    return `${year.slice(-4)}-${month}-${day}`;
  }

  function toggleDietaryPattern(pattern: DietaryPattern) {
    setDietaryPatterns((current) =>
      current.includes(pattern)
        ? current.filter((item) => item !== pattern)
        : [...current, pattern],
    );
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
            Indica tus datos y recibe una recomendación estructurada de exámenes de chequeo
            general, con orientación clínica clara y ordenada.
          </p>
        </div>

        <div className="mt-8">
          <Stepper currentStep={1} />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
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
                  Estos datos se usarán para completar tu orden médica.
                </p>

                <div className="mt-5 grid gap-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Nombre *">
                      <input
                        className={inputCls}
                        value={nameFields.firstName}
                        onChange={(e) =>
                          setNameFields((current) => ({ ...current, firstName: e.target.value }))
                        }
                      />
                    </Field>

                    <Field label="Apellido paterno *">
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

                    <Field label="Apellido materno *">
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
                    <Field label="RUT *">
                      <input
                        ref={rutInputRef}
                        className={showRutInvalid ? errorInputCls : inputCls}
                        value={rut}
                        onChange={(e) => handleRutChange(e.target.value, e.target.selectionStart)}
                        onBlur={() => setRutTouched(true)}
                        inputMode="text"
                        autoComplete="off"
                        placeholder="12.345.678-5"
                      />
                      {showRutInvalid && (
                        <p className="text-xs text-rose-600">RUT inválido.</p>
                      )}
                    </Field>
                    <Field label="Fecha de nacimiento *">
                      <input
                        className={inputCls}
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(normalizeBirthDateInput(e.target.value))}
                      />
                    </Field>
                  </div>

                  {underageWarning && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                      El sistema de órdenes de chequeo preventivo sólo está disponible para
                      personas de 15 años o más. Recuerda además que según nuestros{" "}
                      <Link href="/terminos" className="font-semibold underline">
                        Términos y Condiciones
                      </Link>
                      , los menores de edad deben contar con la supervisión de su tutor.
                    </div>
                  )}

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
                <p className="text-sm font-semibold text-slate-900">2. Contexto clínico</p>
                <p className="mt-1 text-sm text-slate-600">
                  Estos datos ajustan la recomendación clínica y permiten personalizar la orden.
                </p>

                <div className="mt-5 grid gap-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Edad">
                      <input
                        className={readonlyCls}
                        value={age > 0 ? String(age) : ""}
                        readOnly
                        placeholder="Se calcula con la fecha de nacimiento"
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
                        onFocus={selectZeroValueOnFocus}
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
                        onFocus={selectZeroValueOnFocus}
                        onChange={(e) => setHeightCm(Number(e.target.value))}
                      />
                    </Field>
                  </div>

                  <Field label="IMC">
                    <input
                      className={readonlyCls}
                      value={bodyMassIndex > 0 ? bodyMassIndex.toFixed(1) : ""}
                      readOnly
                      placeholder="Se calcula con peso y talla"
                    />
                  </Field>

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

                  <Field label="¿Sigues alguna dieta especial o tienes alguna restricción alimentaria?">
                    <select
                      className={inputCls}
                      value={dietaryRestriction}
                      onChange={(e) => setDietaryRestriction(e.target.value as DietaryRestriction)}
                    >
                      <option value="none">Ninguna</option>
                      <option value="special">Sí</option>
                    </select>
                  </Field>

                  {showsDietaryOptions && (
                    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-medium text-slate-900">Selecciona una o más opciones</p>

                      <div className="grid gap-2 md:grid-cols-2">
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                            checked={dietaryPatterns.includes("vegan")}
                            onChange={() => toggleDietaryPattern("vegan")}
                          />
                          Vegana
                        </label>

                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                            checked={dietaryPatterns.includes("vegetarian")}
                            onChange={() => toggleDietaryPattern("vegetarian")}
                          />
                          Vegetaria
                        </label>

                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                            checked={dietaryPatterns.includes("ketogenic")}
                            onChange={() => toggleDietaryPattern("ketogenic")}
                          />
                          Cetogénica
                        </label>

                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                            checked={dietaryPatterns.includes("gluten_free")}
                            onChange={() => toggleDietaryPattern("gluten_free")}
                          />
                          Libre de gluten
                        </label>
                      </div>
                    </div>
                  )}

                  {showsSmokingIntensity && (
                    <>
                      {smoking === "former" && (
                        <Field label="¡Felicitaciones! ¿Hace cuántos años dejaste de fumar?">
                          <input
                            className={inputCls}
                            type="number"
                            min={0}
                            max={99}
                            value={quitSmokingYearsAgo}
                            onFocus={selectZeroValueOnFocus}
                            onChange={(e) => setQuitSmokingYearsAgo(Number(e.target.value))}
                          />
                        </Field>
                      )}

                      <p className="text-sm font-medium text-slate-900">
                        {smoking === "former"
                          ? "En promedio, ¿cuántos cigarros fumabas al día y durante cuánto tiempo fumaste?"
                          : "En promedio, ¿cuántos cigarros ha fumado al día y durante cuánto tiempo?"}
                      </p>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Cigarros al día">
                          <input
                            className={inputCls}
                            type="number"
                            min={0}
                            max={200}
                            value={cigarettesPerDay}
                            onFocus={selectZeroValueOnFocus}
                            onChange={(e) => setCigarettesPerDay(Number(e.target.value))}
                          />
                        </Field>
                        <Field label="Tiempo fumando (años)">
                          <input
                            className={inputCls}
                            type="number"
                            min={0}
                            max={100}
                            value={smokingYears}
                            onFocus={selectZeroValueOnFocus}
                            onChange={(e) => setSmokingYears(Number(e.target.value))}
                          />
                        </Field>
                      </div>

                      <Field
                        label={
                          <span className="inline-flex items-center gap-2">
                            IPA
                            <span className="group relative inline-flex">
                              <button
                                type="button"
                                aria-label="¿Qué es el IPA?"
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-semibold leading-none text-slate-600"
                              >
                                ?
                              </button>
                              <span className="pointer-events-none absolute left-1/2 top-7 z-10 hidden w-64 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-xs font-normal leading-5 text-slate-600 shadow-xl group-hover:block group-focus-within:block">
                                El IPA (índice paquete-año) estima la carga acumulada de tabaco:
                                combina cuántos cigarros fumas/fumabas al día y por cuántos años.
                                Nos ayuda a estimar riesgo y definir tamizajes como pulmón.
                              </span>
                            </span>
                          </span>
                        }
                      >
                        <input
                          className={readonlyCls}
                          value={packYearIndex > 0 ? packYearIndex.toFixed(1) : ""}
                          readOnly
                          placeholder='Se calcula como: ("cigarros al día"/20) x años fumando'
                        />
                      </Field>
                    </>
                  )}

                  <Field label="¿Eres sexualmente activo?">
                    <select
                      className={inputCls}
                      value={sexualActivity}
                      onChange={(e) => setSexualActivity(e.target.value as SexualActivity)}
                    >
                      <option value="no">No</option>
                      <option value="yes">Sí</option>
                    </select>
                  </Field>

                  <Field label="¿Estás embarazada?">
                    <select
                      className={sex === "F" ? inputCls : readonlyCls}
                      value={pregnancy}
                      onChange={(e) => setPregnancy(e.target.value as Pregnancy)}
                      disabled={sex !== "F"}
                    >
                      <option value="no">No</option>
                      <option value="yes">Sí</option>
                    </select>
                  </Field>

                  {showsPregnancyWeeks && (
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                      <Field label="¿Cuántas semanas tienes de gestación?">
                        <input
                          className={inputCls}
                          type="number"
                          min={0}
                          max={99}
                          value={gestationWeeks}
                          onFocus={selectZeroValueOnFocus}
                          onChange={(e) => setGestationWeeks(Number(e.target.value))}
                        />
                      </Field>

                      {gestationWarning && (
                        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                          ¿Segura? ¡Creo que entonces es hora de llamar a tu obstetra!
                        </p>
                      )}
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
                <p className="text-sm font-semibold text-rose-900">
                  No usar en casos de urgencia.
                </p>
                <p className="mt-2 text-sm leading-6 text-rose-800">
                  Ante síntomas de alarma busca evaluación médica directa.
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
                  <span className="font-medium text-slate-900">RUT:</span>{" "}
                  {patient.rut || "Sin completar"}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Exámenes sugeridos hoy
              </p>
              <div className="mt-4 grid gap-3">
                {rec.tests.map((test) => (
                  <div
                    key={test.name}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-sm font-semibold text-slate-900">{test.name}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{test.why}</p>
                  </div>
                ))}
              </div>
            </div>

            {rec.notes.length > 0 && (
              <div className="mt-6 rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Notas clínicas</p>
                <ul className="mt-3 grid gap-2 text-sm text-slate-700">
                  {rec.notes.map((note, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{note}</span>
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
              {isSubmitting ? "Creando solicitud..." : "Continuar al resumen de la orden"}
            </button>

            {hasMissingRequiredFields && (
              <p className="mt-3 text-xs leading-5 text-amber-700">
                Debes completar estos campos obligatorios para continuar:{" "}
                {missingRequiredFields.join(", ")}.
              </p>
            )}

            {submitError && <p className="mt-3 text-xs leading-5 text-rose-600">{submitError}</p>}

            <p className="mt-3 text-xs leading-5 text-slate-500">
              En la siguiente página podrás modificar y personalizar la orden. Se emite después del
              pago y validación médica.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
const errorInputCls =
  "w-full rounded-xl border border-rose-400 bg-white px-3 py-2 text-sm outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-200";
const readonlyCls =
  "w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600 outline-none";
