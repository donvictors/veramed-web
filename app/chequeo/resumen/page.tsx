"use client";

import Link from "next/link";
import { startTransition, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Stepper from "@/components/checkup/Stepper";
import WhatToExpect from "@/components/checkup/WhatToExpect";
import {
  fetchCheckupRequest,
  type CheckupApiRecord,
  updateCheckupScreeningPreferences,
} from "@/lib/checkup-api";
import { inferOrderDetails } from "@/lib/checkup";

export default function SummaryPage() {
  const router = useRouter();
  const [data, setData] = useState<CheckupApiRecord | null>(null);
  const [colorectalMethod, setColorectalMethod] = useState<"fit" | "colonoscopy">("fit");
  const [cervicalMethod, setCervicalMethod] = useState<"pap" | "hpv" | "cotesting">("pap");
  const [bloodPressureMethod, setBloodPressureMethod] = useState<"mapa" | "skip">("mapa");
  const [bloodPressureInfoOpen, setBloodPressureInfoOpen] = useState(false);
  const [breastImaging, setBreastImaging] = useState<"mammo_only" | "mammo_plus_ultrasound">(
    "mammo_only",
  );
  const [prostateMethod, setProstateMethod] = useState<"include" | "skip">("include");
  const [selectionError, setSelectionError] = useState("");
  const requestId =
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("id");

  useEffect(() => {
    if (!requestId) {
      router.replace("/chequeo");
      return;
    }

    void fetchCheckupRequest(requestId)
      .then((checkup) => {
        const storedMethod = checkup.rec.tests.some(
          (test) => test.name === "Colonoscopía total",
        )
          ? "colonoscopy"
          : "fit";
        const storedCervicalMethod = checkup.rec.tests.some(
          (test) =>
            test.name === "Cotesting (PAP+VPH)" ||
            (checkup.rec.tests.some((item) => item.name === "Papanicolau (PAP)") &&
              checkup.rec.tests.some(
                (item) => item.name === "PCR de virus papiloma humano (VPH)",
              )),
        )
          ? "cotesting"
          : checkup.rec.tests.some(
                (test) =>
                  test.name === "Test de VPH (HPV)" ||
                  test.name === "PCR de virus papiloma humano (VPH)",
              )
            ? "hpv"
            : "pap";
        const storedBloodPressureMethod = checkup.rec.tests.some(
          (test) => test.name === "Holter de presión arterial (MAPA)",
        )
          ? "mapa"
          : "skip";
        const storedBreastImaging = checkup.rec.tests.some(
          (test) => test.name === "Ecografía mamaria",
        )
          ? "mammo_plus_ultrasound"
          : "mammo_only";
        const storedProstateMethod = checkup.rec.tests.some(
          (test) => test.name === "Antígeno prostático específico (APE)",
        )
          ? "include"
          : "skip";

        startTransition(() => {
          setData(checkup);
          setColorectalMethod(storedMethod);
          setCervicalMethod(storedCervicalMethod);
          setBloodPressureMethod(storedBloodPressureMethod);
          setBreastImaging(storedBreastImaging);
          setProstateMethod(storedProstateMethod);
        });
      })
      .catch(() => {
        router.replace("/chequeo");
      });
  }, [requestId, router]);

  if (!data) return null;

  const orderDetails = inferOrderDetails(data.rec.tests);
  const hasColorectalScreening = data.input.age >= 45 && data.input.age <= 75;
  const hasCervicalScreening =
    data.input.sex === "F" &&
    data.input.age >= 21 &&
    data.input.age <= 65;
  const hasBloodPressureScreening = data.input.age > 18;
  const hasBreastScreening =
    data.input.sex === "F" &&
    data.input.age >= 40 &&
    data.input.age <= 74;
  const hasProstateScreening =
    data.input.sex === "M" &&
    data.input.age >= 55 &&
    data.input.age <= 69;
  const hasCustomizableScreenings =
    hasColorectalScreening ||
    hasCervicalScreening ||
    hasBloodPressureScreening ||
    hasBreastScreening ||
    hasProstateScreening;
  const displayedTests = data.rec.tests.flatMap((test) => {
    if (test.name === "Tamizaje de cáncer colorrectal") {
      return [{
        ...test,
        name:
          colorectalMethod === "fit"
            ? "Test inmunológico de sangre oculta en deposiciones"
            : "Colonoscopía total",
        why: "Indicamos tamizaje de cáncer colorrectal a todas las personas de 45 años o más. Se incluye el método de tu elección realizada en la parte superior.",
      }];
    }

    if (test.name === "Tamizaje de cáncer cervicouterino") {
      if (cervicalMethod === "cotesting") {
        return [
          {
            ...test,
            name: "Papanicolau (PAP)",
            why: "Indicamos tamizaje de cáncer cervicouterino a todas las personas de sexo femenino entre 21 y 65 años. Se incluye el método de tu elección realizada en la parte superior.",
          },
          {
            ...test,
            name: "PCR de virus papiloma humano (VPH)",
            why: "Indicamos tamizaje de cáncer cervicouterino a todas las personas de sexo femenino entre 21 y 65 años. Se incluye el método de tu elección realizada en la parte superior.",
          },
        ];
      }

      return [{
        ...test,
        name:
          cervicalMethod === "pap"
            ? "Papanicolau (PAP)"
            : "PCR de virus papiloma humano (VPH)",
        why: "Indicamos tamizaje de cáncer cervicouterino a todas las personas de sexo femenino entre 21 y 65 años. Se incluye el método de tu elección realizada en la parte superior.",
      }];
    }

    if (test.name === "Papanicolau") {
      return [{ ...test, name: "Papanicolau (PAP)" }];
    }

    if (test.name === "Test de VPH (HPV)") {
      return [{ ...test, name: "PCR de virus papiloma humano (VPH)" }];
    }

    if (test.name === "Tamizaje de cáncer de mama") {
      return [{
        ...test,
        name: "Mamografía bilateral",
        why: "Indicamos tamizaje de cáncer de mama a personas de sexo femenino entre 40 y 74 años. Por defecto se mantiene mamografía bilateral y puedes agregar ecografía mamaria en la parte superior.",
      }];
    }

    return [test];
  }).filter((test) => {
    if (
      test.name === "Holter de presión arterial (MAPA)" &&
      hasBloodPressureScreening &&
      bloodPressureMethod === "skip"
    ) {
      return false;
    }

    if (
      test.name === "Antígeno prostático específico (APE)" &&
      hasProstateScreening &&
      prostateMethod === "skip"
    ) {
      return false;
    }

    return true;
  });
  const removedTests = data.rec.removedTests ?? [];
  const imageExamNames = new Set([
    "Mamografía bilateral",
    "Ecografía mamaria",
    "Ecografía abdominal",
    "TC de tórax de baja dosis",
    "Densitometría ósea",
  ]);
  const procedureNames = new Set([
    "Holter de presión arterial (MAPA)",
    "Tamizaje de cáncer cervicouterino",
    "Papanicolau (PAP)",
    "PCR de virus papiloma humano (VPH)",
    "Cotesting (PAP+VPH)",
    "Tamizaje de cáncer colorrectal",
    "Colonoscopía total",
    "Electrocardiograma (ECG)",
    "Espirometría basal y post broncodilatador",
  ]);
  const summaryCounts = displayedTests.reduce(
    (acc, test) => {
      if (imageExamNames.has(test.name)) {
        acc.image += 1;
      } else if (procedureNames.has(test.name)) {
        acc.procedure += 1;
      } else {
        acc.laboratory += 1;
      }

      return acc;
    },
    { laboratory: 0, image: 0, procedure: 0 },
  );
  const optionalAdditionalTests = [
    {
      name: "Hemograma",
      description:
        "Aporta una visión general de glóbulos rojos, glóbulos blancos y plaquetas. Puede ayudar a detectar anemia, infecciones o alteraciones hematológicas básicas.",
    },
    {
      name: "Creatinina en sangre",
      description:
        "Se usa para estimar de forma indirecta la función renal y puede orientar sobre cómo están trabajando tus riñones.",
    },
    {
      name: "Perfil bioquímico",
      description:
        "Es un panel general que revisa parámetros metabólicos y orgánicos básicos, útil como complemento amplio del chequeo.",
    },
  ] as const;
  const selectedOptionalAdditionalTests = optionalAdditionalTests.filter((test) =>
    data.rec.tests.some((item) => item.name === test.name),
  );

  async function handlePreferenceChange(
    preferences: Parameters<typeof updateCheckupScreeningPreferences>[1],
  ) {
    if (!requestId) {
      return;
    }
    setSelectionError("");

    try {
      const updated = await updateCheckupScreeningPreferences(requestId, preferences);
      startTransition(() => {
        setData(updated);
      });
    } catch (error) {
      setSelectionError(
        error instanceof Error
          ? error.message
          : "No pudimos guardar tu elección de tamizaje.",
      );
    }
  }

  async function handleColorectalMethodChange(method: "fit" | "colonoscopy") {
    setColorectalMethod(method);
    await handlePreferenceChange({ colorectalMethod: method });
  }

  async function handleCervicalMethodChange(method: "pap" | "hpv" | "cotesting") {
    setCervicalMethod(method);
    await handlePreferenceChange({ cervicalMethod: method });
  }

  async function handleBloodPressureMethodChange(method: "mapa" | "skip") {
    setBloodPressureMethod(method);
    await handlePreferenceChange({ bloodPressureMethod: method });
  }

  async function handleBreastImagingChange(method: "mammo_only" | "mammo_plus_ultrasound") {
    setBreastImaging(method);
    await handlePreferenceChange({ breastImaging: method });
  }

  async function handleProstateMethodChange(method: "include" | "skip") {
    setProstateMethod(method);
    await handlePreferenceChange({ prostateMethod: method });
  }

  async function handleOptionalAdditionalTestChange(testName: string, checked: boolean) {
    if (checked) {
      await handlePreferenceChange({ addTestName: testName });
      return;
    }

    await handlePreferenceChange({ removeTestName: testName });
  }

  async function handleRemoveTest(testName: string) {
    if (
      testName === "Test inmunológico de sangre oculta en deposiciones" ||
      testName === "Colonoscopía total" ||
      testName === "Tamizaje de cáncer colorrectal"
    ) {
      setColorectalMethod(testName === "Colonoscopía total" ? "colonoscopy" : "fit");
    }

    if (
      testName === "Papanicolau" ||
      testName === "Papanicolau (PAP)" ||
      testName === "Test de VPH (HPV)" ||
      testName === "PCR de virus papiloma humano (VPH)" ||
      testName === "Cotesting (PAP+VPH)" ||
      testName === "Tamizaje de cáncer cervicouterino"
    ) {
      setCervicalMethod(
        testName === "Test de VPH (HPV)" || testName === "PCR de virus papiloma humano (VPH)"
          ? "hpv"
          : testName === "Cotesting (PAP+VPH)"
            ? "cotesting"
            : "pap",
      );
    }

    if (testName === "Holter de presión arterial (MAPA)") {
      setBloodPressureMethod("skip");
    }

    if (testName === "Ecografía mamaria") {
      setBreastImaging("mammo_only");
    }

    if (testName === "Antígeno prostático específico (APE)") {
      setProstateMethod("skip");
    }

    await handlePreferenceChange({ removeTestName: testName });
  }

  async function handleRestoreTest(testName: string) {
    if (
      testName === "Test inmunológico de sangre oculta en deposiciones" ||
      testName === "Colonoscopía total"
    ) {
      setColorectalMethod(testName === "Colonoscopía total" ? "colonoscopy" : "fit");
    }

    if (
      testName === "Papanicolau" ||
      testName === "Papanicolau (PAP)" ||
      testName === "Test de VPH (HPV)" ||
      testName === "PCR de virus papiloma humano (VPH)" ||
      testName === "Cotesting (PAP+VPH)"
    ) {
      setCervicalMethod(
        testName === "Test de VPH (HPV)" || testName === "PCR de virus papiloma humano (VPH)"
          ? "hpv"
          : testName === "Cotesting (PAP+VPH)"
            ? "cotesting"
            : "pap",
      );
    }

    if (testName === "Holter de presión arterial (MAPA)") {
      setBloodPressureMethod("mapa");
    }

    if (testName === "Ecografía mamaria") {
      setBreastImaging("mammo_plus_ultrasound");
    }

    if (testName === "Antígeno prostático específico (APE)") {
      setProstateMethod("include");
    }

    await handlePreferenceChange({ restoreTestName: testName });
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Resumen del chequeo
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              Tu ficha de orden está lista para revisión.
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">{data.rec.summary}</p>
          </div>

          <Link
            href={`/chequeo?id=${data.id}`}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          >
            Editar datos
          </Link>
        </div>

        <div className="mt-8">
          <Stepper currentStep={2} />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Ficha de orden</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Últimos ajustes a tu orden de exámenes
                </h2>
              </div>
            </div>

            {hasCustomizableScreenings && (
              <div className="mt-6 rounded-3xl border border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-900">
                  Elige tus métodos de tamizaje antes de continuar
                </p>
                <div className="mt-4 grid gap-5">
                  {hasColorectalScreening && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">
                        Elige tu método de tamizaje de cáncer colorrectal
                      </p>
                      <div className="mt-3 grid gap-3">
                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <input
                            type="radio"
                            name="colorectal-method"
                            checked={colorectalMethod === "fit"}
                            onChange={() => void handleColorectalMethodChange("fit")}
                            className="mt-1"
                          />
                          <div className="flex min-w-0 items-start gap-3">
                            <p className="text-sm font-semibold text-slate-900">
                              Test inmunológico de sangre oculta en deposiciones
                            </p>
                            <TooltipInfo text="Examen que detecta en una muestra de deposiciones (heces) restos de hemoglobina provenientes de cualquier parte del tubo digestivo. Para que tenga un impacto como método de tamizaje del cáncer colorrectal se debe realizar de forma ANUAL (importa que seas adherente). Un resultado positivo debe ser discutido con un médico, pero suele requerir de la realización posterior de una colonoscopía total." />
                          </div>
                        </label>

                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <input
                            type="radio"
                            name="colorectal-method"
                            checked={colorectalMethod === "colonoscopy"}
                            onChange={() => void handleColorectalMethodChange("colonoscopy")}
                            className="mt-1"
                          />
                          <div className="flex min-w-0 items-start gap-3">
                            <p className="text-sm font-semibold text-slate-900">Colonoscopía total</p>
                            <TooltipInfo text="Corresponde al gold standard para el tamizaje de cáncer colorrectal. Una colonoscopía normal permite liberar de la necesidad de tamizaje por hasta 10 años (aunque algunos expertos recomiendan sólo 5 años en Chile, lo que te sugerimos conversar con el resultado con tu médico). En caso de encontrar pólipos estos se extirparán y enviarán a biopsia y según el resultado de esta biopsia es que el médico tratante debe definir la frecuencia de colonoscopía posterior (puedes requerir más seguido que cada 10 años). Su principal desventaja es que es más costosa y tiene riesgo de complicaciones (dolor, sangrado, infección, perforación, entre otras), las que si bien son infrecuentes cuando son realizadas por operadores expertos en centros adecuados, no son imposibles. Si te decides por este método puedes discutir más sobre las potenciales complicaciones con el médico que te realizará el procedimiento." />
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {hasCervicalScreening && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">
                        Elige tu método de tamizaje cervicouterino
                      </p>
                      <div className="mt-3 grid gap-3">
                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <input
                            type="radio"
                            name="cervical-method"
                            checked={cervicalMethod === "pap"}
                            onChange={() => void handleCervicalMethodChange("pap")}
                            className="mt-1"
                          />
                          <div className="flex min-w-0 items-start gap-3">
                            <p className="text-sm font-semibold text-slate-900">
                              Papanicolau (desde los 21 años)
                            </p>
                            <TooltipInfo text="Método clásico de tamizaje cervicouterino. Evalúa cambios celulares del cuello uterino y sigue siendo una alternativa válida y ampliamente disponible." />
                          </div>
                        </label>

                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <input
                            type="radio"
                            name="cervical-method"
                            checked={cervicalMethod === "hpv"}
                            onChange={() => void handleCervicalMethodChange("hpv")}
                            className="mt-1"
                          />
                          <div className="flex min-w-0 items-start gap-3">
                            <p className="text-sm font-semibold text-slate-900">
                              Test de VPH (desde los 30 años)
                            </p>
                            <TooltipInfo text="Busca la presencia de virus papiloma humano de alto riesgo mediante PCR. En muchos contextos se usa como estrategia primaria o complementaria según edad y disponibilidad." />
                          </div>
                        </label>

                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <input
                            type="radio"
                            name="cervical-method"
                            checked={cervicalMethod === "cotesting"}
                            onChange={() => void handleCervicalMethodChange("cotesting")}
                            className="mt-1"
                          />
                          <div className="flex min-w-0 items-start gap-3">
                            <p className="text-sm font-semibold text-slate-900">
                              Cotesting (PAP+VPH, desde los 30 años)
                            </p>
                            <TooltipInfo text="Combina citología (Papanicolau) y detección de VPH de alto riesgo en la misma estrategia de tamizaje. Suele usarse desde los 30 años, porque mejora la sensibilidad y permite una evaluación más completa cuando está disponible." />
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {hasBloodPressureScreening && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <button
                        type="button"
                        onClick={() => setBloodPressureInfoOpen((current) => !current)}
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <span className="text-sm font-semibold text-slate-900">
                          ¿Prefieres no hacerte el Holter de presión arterial (MAPA)?
                        </span>
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-sm text-slate-600 transition ${
                            bloodPressureInfoOpen ? "rotate-180" : ""
                          }`}
                        >
                          v
                        </span>
                      </button>
                      {bloodPressureInfoOpen && (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Las guías internacionales recomiendan el tamizaje de presión arterial una vez al año en mayores de 18 años, pero no recomiendan un método específico. Creemos que el Holter de presión arterial es el método más práctico para personas que desean chequear esto en su casa, sin embargo no es el único. Una alternativa es la medición en la consulta por un profesional de salud, por lo que si en el último año te han medido la presión y resultó normal (&lt;140/90), puedes no hacerte este examen. Otra alternativa es medirte tu la presión en la casa, lo que se conoce como automonitoreo de presión arterial (AMPA), pero esto es importante hacerlo con aparatos de presión que la midan en el brazo (¡no en la muñeca!) y que estén validados. Si quieres saber si un equipo está validado, puedes revisarlo{" "}
                          <a
                            href="/documentos/ampa-validados.pdf"
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-slate-900 underline underline-offset-2"
                          >
                            aquí
                          </a>
                          .
                        </p>
                      )}
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <input
                            type="radio"
                            name="blood-pressure-method"
                            checked={bloodPressureMethod === "mapa"}
                            onChange={() => void handleBloodPressureMethodChange("mapa")}
                            className="mt-1"
                          />
                          <p className="text-sm font-semibold text-slate-900">
                            Quiero mantener el Holter de presión arterial (MAPA)
                          </p>
                        </label>

                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <input
                            type="radio"
                            name="blood-pressure-method"
                            checked={bloodPressureMethod === "skip"}
                            onChange={() => void handleBloodPressureMethodChange("skip")}
                            className="mt-1"
                          />
                          <p className="text-sm font-semibold text-slate-900">
                            No, no incluirlo por ahora
                          </p>
                        </label>
                      </div>
                    </div>
                  )}

                  {hasBreastScreening && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">
                        Tamizaje de cáncer de mama
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Por defecto se mantiene una mamografía bilateral. Si quieres, puedes sumar
                        además una ecografía mamaria como complemento.
                      </p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <input
                            type="radio"
                            name="breast-imaging"
                            checked={breastImaging === "mammo_only"}
                            onChange={() => void handleBreastImagingChange("mammo_only")}
                            className="mt-1"
                          />
                          <p className="text-sm font-semibold text-slate-900">
                            Solo mamografía bilateral
                          </p>
                        </label>

                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <input
                            type="radio"
                            name="breast-imaging"
                            checked={breastImaging === "mammo_plus_ultrasound"}
                            onChange={() => void handleBreastImagingChange("mammo_plus_ultrasound")}
                            className="mt-1"
                          />
                          <p className="text-sm font-semibold text-slate-900">
                            Agregar ecografía mamaria
                          </p>
                        </label>
                      </div>
                    </div>
                  )}

                  {hasProstateScreening && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">
                        ¿Quieres mantener el tamizaje con Antígeno prostático específico (APE)?
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Puedes dejarlo incluido o excluirlo por ahora. El beneficio potencial es la
                        detección precoz, pero también puede generar sobrediagnóstico y estudios
                        posteriores que no siempre serán necesarios.
                      </p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <input
                            type="radio"
                            name="prostate-method"
                            checked={prostateMethod === "include"}
                            onChange={() => void handleProstateMethodChange("include")}
                            className="mt-1"
                          />
                          <p className="text-sm font-semibold text-slate-900">
                            Sí, mantener APE en mi orden
                          </p>
                        </label>

                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <input
                            type="radio"
                            name="prostate-method"
                            checked={prostateMethod === "skip"}
                            onChange={() => void handleProstateMethodChange("skip")}
                            className="mt-1"
                          />
                          <p className="text-sm font-semibold text-slate-900">
                            No, prefiero no incluirlo
                          </p>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {selectionError && (
                  <p className="mt-3 text-xs leading-5 text-rose-600">{selectionError}</p>
                )}
              </div>
            )}

            <div className="mt-6">
              <div className="rounded-3xl border border-slate-200 p-5">
                <div className="flex items-start gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    ¿Deseas agregar un examen adicional?
                  </p>
                  <TooltipInfo text="Los siguientes exámenes no están recomendados en base a evidencia como parte del tamizaje de personas sanas, pero muchos médicos los piden en su práctica clínica de todas formas. En Veramed creemos que su solicitud es de bajo riesgo de cascadas diagnósticas/sobrediagnóstico, por lo que si deseas puedes añadir los siguientes." />
                </div>
                <div className="mt-4 grid gap-3">
                  {optionalAdditionalTests.map((test) => {
                    const checked = selectedOptionalAdditionalTests.some(
                      (selected) => selected.name === test.name,
                    );

                    return (
                      <label
                        key={test.name}
                        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            void handleOptionalAdditionalTestChange(
                              test.name,
                              event.target.checked,
                            )
                          }
                          className="mt-1"
                        />
                        <div className="flex min-w-0 items-start gap-3">
                          <p className="text-sm font-semibold text-slate-900">{test.name}</p>
                          <TooltipInfo text={test.description} />
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <p className="mt-6 text-sm font-semibold text-slate-900">
                Exámenes incluidos (edítalos según tus preferencias)
              </p>
              <div className="mt-4 grid gap-3">
                {displayedTests.map((t) => (
                  <div key={t.name} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                      <button
                        type="button"
                        onClick={() => void handleRemoveTest(t.name)}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-950"
                        aria-label={`Eliminar ${t.name}`}
                      >
                        x
                      </button>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{t.why}</p>
                  </div>
                ))}
              </div>

              {removedTests.length > 0 && (
                <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-100 p-4">
                  <p className="text-sm font-semibold text-slate-700">
                    Eliminaste estos exámenes, ¿deseas volverlos a añadir?
                  </p>
                  <div className="mt-3 grid gap-2">
                    {removedTests.map((test) => (
                      <button
                        key={test.name}
                        type="button"
                        onClick={() => void handleRestoreTest(test.name)}
                        className="flex items-center justify-between rounded-2xl border border-slate-300 bg-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                      >
                        <span>{test.name}</span>
                        <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                          Reagregar
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {data.rec.notes.length > 0 && (
              <div className="mt-6 rounded-3xl border border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-900">Notas clínicas</p>
                <ul className="mt-3 grid gap-2 text-sm text-slate-700">
                  {data.rec.notes.map((n, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <div className="grid self-start content-start gap-4">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Resumen final de tu solicitud
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                Conteo por tipo de examen.
              </h2>
              <div className="mt-6 grid gap-4">
                <span className="inline-flex w-fit rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  Vigencia sugerida: 60 días
                </span>
                <MetricCard
                  label={`Incluye ${orderDetails.includedCount} exámenes`}
                  value={`Set recomendado: ${summaryCounts.laboratory} examen(es) de laboratorio, ${summaryCounts.image} examen(es) de imagen, ${summaryCounts.procedure} procedimiento(s)`}
                />
                <MetricCard
                  label={`Necesita ayuno: ${orderDetails.needsFasting ? "Sí" : "No"}`}
                  value="Preparación previa"
                />
                <MetricCard
                  label={`Tipo de muestra: ${orderDetails.sampleTypeLabel}`}
                  value="Muestras"
                />
              </div>

              <div className="mt-6 rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Preparación</p>
                <ul className="mt-3 grid gap-2 text-sm text-slate-700">
                  {orderDetails.preparation.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <WhatToExpect />

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Siguiente paso
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                Continúa al pago para emitir la orden.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                El pago habilita la validación clínica y la posterior descarga de tu orden médica.
              </p>

              <Link
                href={`/chequeo/pago?id=${data.id}`}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Ir a pagar
              </Link>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Una vez confirmado el pago, la solicitud pasa a revisión y queda disponible para
                descarga.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-sm text-slate-500">{value}</p>
    </div>
  );
}

function TooltipInfo({ text }: { text: ReactNode }) {
  return (
    <span className="group relative inline-flex shrink-0">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-600">
        ?
      </span>
      <span className="pointer-events-none absolute left-full top-1/2 z-10 ml-3 hidden w-80 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-normal leading-6 text-slate-700 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.35)] group-hover:block">
        {text}
      </span>
    </span>
  );
}
