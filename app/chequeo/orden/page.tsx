"use client";

import { Fragment, startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import { fetchCheckupRequest, type CheckupApiRecord } from "@/lib/checkup-api";
import { sendOrderReadyEmail } from "@/lib/email-api";
import {
  createVerificationCode,
  formatBirthDate,
  formatSex,
  formatSexualActivity,
  formatSmoking,
  inferOrderDetails,
} from "@/lib/checkup";

export default function OrderPage() {
  const router = useRouter();
  const [data, setData] = useState<CheckupApiRecord | null>(null);
  const [approved, setApproved] = useState(false);
  const [paid, setPaid] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<OrderCategory>("laboratory");
  const [issuedAt, setIssuedAt] = useState("");
  const [issuedAtTimestamp, setIssuedAtTimestamp] = useState(0);
  const requestId =
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("id");

  useEffect(() => {
    if (!requestId) {
      router.replace("/chequeo");
      return;
    }

    void fetchCheckupRequest(requestId)
      .then((checkup) => {
        const issuedTimestamp =
          checkup.status.approvedAt ?? checkup.status.queuedAt ?? checkup.updatedAt;
        const formattedDate = new Intl.DateTimeFormat("es-CL", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(issuedTimestamp));

        startTransition(() => {
          setData(checkup);
          setIssuedAt(formattedDate);
          setIssuedAtTimestamp(issuedTimestamp);
          setApproved(checkup.status.status === "approved");
          setPaid(Boolean(checkup.payment.confirmed?.paid));
        });
      })
      .catch(() => {
        router.replace("/mi-cuenta");
      });
  }, [requestId, router]);

  useEffect(() => {
    if (!data || !requestId || !approved || !paid) {
      return;
    }

    const recipient = data.patient?.email?.trim();
    if (!recipient) {
      return;
    }

    const storageKey = `veramed:order-email:${requestId}`;
    const alreadySent = localStorage.getItem(storageKey);
    if (alreadySent === "sent" || alreadySent === "pending") {
      return;
    }

    localStorage.setItem(storageKey, "pending");

    const orderLink = `${window.location.origin}/chequeo/orden?id=${requestId}`;

    void sendOrderReadyEmail({
      requestType: "checkup",
      requestId,
      email: recipient,
      patientName: data.patient?.fullName,
      orderLink,
    })
      .then(() => {
        localStorage.setItem(storageKey, "sent");
      })
      .catch(() => {
        localStorage.removeItem(storageKey);
      });
  }, [approved, data, paid, requestId]);

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <h1 className="text-2xl font-semibold">No hay datos del chequeo</h1>
          <p className="mt-2 text-slate-600">Vuelve a generar un chequeo primero.</p>
          <Link href="/chequeo" className="mt-6 inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm text-white">
            Ir a chequeo
          </Link>
        </div>
      </main>
    );
  }

  const categorizedTests = categorizeCheckupTests(data.rec.tests);
  const allTests = data.rec.tests;
  const laboratoryTests = categorizedTests.laboratory;
  const availableCategories = ORDER_CATEGORIES.filter(
    (category) => categorizedTests[category].length > 0,
  );
  const printCategory =
    availableCategories.find((category) => category === selectedCategory) ??
    availableCategories[0] ??
    "laboratory";
  const printTests = categorizedTests[printCategory];
  const displayOrderDetails = inferOrderDetails(
    laboratoryTests.length > 0 ? laboratoryTests : allTests,
  );
  const printOrderDetails = inferOrderDetails(printTests);
  const printCategoryMeta = getOrderCategoryMeta(printCategory);
  const paperConfig = LETTER_PRINT_CONFIG;
  const printPages = chunkTestsForPrint(printTests, printCategory, paperConfig);
  const patient = data.patient;
  const verificationCode = issuedAtTimestamp
    ? createVerificationCode(patient?.rut, issuedAtTimestamp)
    : "";

  function handlePrint(category: OrderCategory) {
    setSelectedCategory(category);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.print();
      });
    });
  }

  if (!paid) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Acceso restringido
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Debes completar el pago antes de descargar la orden.
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              La emisión clínica de la orden se habilita una vez confirmado el pago del servicio.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/chequeo/pago?id=${requestId}`}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Ir a pagar
              </Link>
              <Link
                href={`/chequeo/resumen?id=${requestId}`}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Volver al resumen
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="veramed-order-root min-h-screen bg-slate-50 text-slate-900 print:bg-white">
      <div className="mx-auto max-w-5xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
        <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
          <div className="rounded-2xl border border-slate-300 bg-slate-100 px-5 py-4 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Orden clínica imprimible
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Tus órdenes de exámenes ➡️
            </h1>
            <p className="mt-1 text-base text-slate-600">
              Te enviamos las órdenes a tu correo (recuerda revisar tu bandeja de spam).
              <br />
              <span className="font-semibold">Haz clic</span> en los recuadros de la derecha si
              deseas imprimirlas ahora. 😉
            </p>
            <p className="mt-1 text-[11px] text-right text-slate-600">
              ID de referencia: {verificationCode}
            </p>
          </div>

          <div className="print:hidden">
            <p className="-mt-1 mb-3 text-right text-xs text-slate-500">
              <span className="underline">Haz clic</span> en estos recuadros para guardar o
              imprimir tu orden.
              <br />
              Recuerda intentar cuidar el planeta. 🌱
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              {ORDER_CATEGORIES.map((category) => {
                const count = categorizedTests[category].length;
                const meta = getOrderCategoryMeta(category);
                const isActive = printCategory === category;

                return (
                  <button
                    key={category}
                    onClick={() => handlePrint(category)}
                    disabled={count === 0}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-slate-900 text-white hover:bg-slate-800"
                        : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
                    } disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400`}
                  >
                    {meta.shortLabel} ({count})
                  </button>
                );
              })}
              <Link
                href={`/chequeo/estado?id=${requestId}`}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Volver
              </Link>
            </div>
          </div>
        </div>

        {!approved && (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 print:hidden">
            <p className="text-sm font-semibold text-amber-900">Orden pendiente de aprobación</p>
            <p className="mt-1 text-sm text-amber-800">
              La orden se encuentra en revisión clínica. Puedes revisar el avance en{" "}
              <Link className="font-semibold underline" href={`/chequeo/estado?id=${requestId}`}>
                estado
              </Link>
              .
            </p>
          </div>
        )}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)] print:hidden">
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-6">
            <div>
              <BrandLogo className="h-28 w-auto" />
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Orden médica de exámenes
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Documento generado mediante tecnología de flujo de chequeo preventivo de Veramed ©
                y validación técnica por médico firmante.
              </p>
            </div>

            <div className="grid gap-3 text-sm sm:min-w-72 sm:grid-cols-2">
              <MetaRow label="ID" value={verificationCode} />
              <MetaRow label="Fecha y hora" value={issuedAt} />
              <MetaRow label="Estado" value={approved ? "Aprobada" : "Pendiente de validación"} />
              <MetaRow label="Ciudad de referencia" value="Santiago, Chile" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm md:grid-cols-2">
            <Info label="Nombre" value={patient?.fullName || "No informado"} />
            <Info label="RUT" value={patient?.rut || "No informado"} />
            <Info label="Fecha de nacimiento" value={formatBirthDate(patient?.birthDate || "")} />
            <Info label="Correo" value={patient?.email || "No informado"} />
            <Info label="Teléfono" value={patient?.phone || "No informado"} />
            <Info label="Dirección" value={patient?.address || "No informada"} />
            <Info label="Edad" value={`${data.input.age}`} />
            <Info label="Sexo" value={formatSex(data.input.sex)} />
            <Info label="Peso" value={`${data.input.weightKg} kg`} />
            <Info label="Talla" value={`${data.input.heightCm} cm`} />
            <Info label="Tabaco" value={formatSmoking(data.input.smoking)} />
            <Info label="Actividad sexual" value={formatSexualActivity(data.input.sexualActivity)} />
          </div>

            <div className="mt-8 rounded-3xl bg-slate-50 p-5">
              <div className="grid gap-4 md:grid-cols-4">
                <SummaryCell label="Exámenes" value={`${allTests.length}`} />
                <SummaryCell
                  label="Ayuno"
                  value={laboratoryTests.length > 0 ? (displayOrderDetails.needsFasting ? "Sí" : "No") : "No aplica"}
                />
                <SummaryCell
                  label="Muestra"
                  value={laboratoryTests.length > 0 ? displayOrderDetails.sampleTypeLabel : "No aplica"}
                />
                <SummaryCell label="Vigencia sugerida" value="60 días" />
              </div>
            </div>

          <div className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Indicación clínica
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              Se identificaron {allTests.length} exámenes preventivos según tus datos clínicos.
            </p>
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Tabla de exámenes
            </p>
            <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-700">Examen / procedimiento</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Justificación clínica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {ORDER_CATEGORIES.map((category) => {
                    const tests = categorizedTests[category];
                    if (tests.length === 0) {
                      return null;
                    }

                    const groupLabel = getOrderCategoryMeta(category).shortLabel;

                    return (
                      <Fragment key={`group-${category}`}>
                        <tr className="bg-slate-100">
                          <td
                            colSpan={2}
                            className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600"
                          >
                            {groupLabel}
                          </td>
                        </tr>
                        {tests.map((test) => (
                          <tr key={`${category}-${test.name}`}>
                            <td className="px-4 py-4 align-top font-semibold text-slate-900">
                              {test.name}
                            </td>
                            <td className="px-4 py-4 align-top text-slate-600">{test.why}</td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8">
            <div className="rounded-3xl border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-900">Preparación</p>
              <ul className="mt-3 grid gap-2 text-sm text-slate-700">
                {(laboratoryTests.length > 0
                  ? displayOrderDetails.preparation
                  : [
                      "Confirma con el centro si requiere preparación específica antes de asistir.",
                    ]).map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {data.rec.notes.length > 0 && (
            <div className="mt-8 rounded-3xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Observaciones adicionales</p>
              <ul className="mt-3 grid gap-2 text-sm text-slate-700">
                {data.rec.notes.map((note, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 grid gap-6 border-t border-slate-200 pt-6 md:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Médico validador</p>
              <p className="mt-2 text-sm font-medium text-slate-700">Dr. Víctor Rebolledo M.</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                RUT 18.856.820-3 / RCM 46129-6 / SIS N°611341
                <br />
                Médico staff de Veramed.
              </p>
            </div>

            <div className="rounded-3xl bg-slate-950 p-5 text-white">
              <p className="text-sm font-semibold">Advertencia de uso</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                Los resultados de estos exámenes deben interpretarse dentro del contexto clínico
                del paciente y no está pensado para ser usado para resolver cuadros agudos o lidiar
                con emergencias médicas.
              </p>
            </div>
          </div>
        </section>

        <p className="mt-6 text-xs text-slate-500 print:hidden">
          Cada botón imprime o guarda un PDF independiente según la categoría seleccionada.
        </p>

        <section className="veramed-print-shell hidden print:block">
          {printPages.map((pageTests, pageIndex) => (
            <PrintOrderPage
              key={`${printCategory}-${pageIndex}`}
              category={printCategory}
              categoryMeta={printCategoryMeta}
              patient={patient}
              orderDetails={printOrderDetails}
              pageTests={pageTests}
              issuedAt={issuedAt}
              verificationCode={verificationCode}
              pageIndex={pageIndex}
              totalPages={printPages.length}
            />
          ))}
        </section>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: auto;
            margin: 10mm 10mm 12mm 10mm;
          }

          .veramed-order-root {
            min-height: auto !important;
            background: #ffffff !important;
          }

          .veramed-order-page {
            box-sizing: border-box;
            display: grid;
            grid-template-rows: auto 1fr auto;
            height: ${LETTER_PRINT_CONFIG.contentHeightMm}mm;
            break-inside: avoid;
            page-break-inside: avoid;
            break-after: page;
            page-break-after: always;
          }

          .veramed-order-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }

          .veramed-order-item {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .veramed-order-footer {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

type OrderCategory = "laboratory" | "image" | "procedure";

const ORDER_CATEGORIES: OrderCategory[] = ["laboratory", "image", "procedure"];
const LETTER_PRINT_CONFIG = {
  cssSize: "letter portrait",
  contentHeightMm: 257.4,
  bodyHeightMm: 164,
};

function categorizeCheckupTests(tests: CheckupApiRecord["rec"]["tests"]) {
  return {
    laboratory: tests.filter((test) => getTestCategory(test.name) === "laboratory"),
    image: tests.filter((test) => getTestCategory(test.name) === "image"),
    procedure: tests.filter((test) => getTestCategory(test.name) === "procedure"),
  };
}

function getOrderCategoryMeta(category: OrderCategory) {
  if (category === "image") {
    return {
      shortLabel: "Imágenes",
      badge: "Orden médica de imágenes",
      screenTitle: "Orden de imágenes",
      printTitle: "ORDEN DE IMÁGENES",
      tableLabel: "Imagen / examen",
    };
  }

  if (category === "procedure") {
    return {
      shortLabel: "Procedimientos",
      badge: "Orden médica de procedimientos",
      screenTitle: "Orden de procedimientos",
      printTitle: "ORDEN DE PROCEDIMIENTOS",
      tableLabel: "Procedimiento",
    };
  }

  return {
    shortLabel: "Laboratorio",
    badge: "Orden médica de laboratorio",
    screenTitle: "Orden de laboratorio",
    printTitle: "ORDEN DE LABORATORIO",
    tableLabel: "Examen",
  };
}

function getTestCategory(testName: string): OrderCategory {
  const imageTests = new Set([
    "Ecografía abdominal",
    "Mamografía bilateral",
    "Ecografía mamaria",
    "TC de tórax de baja dosis",
    "Densitometría ósea",
  ]);
  const procedureTests = new Set([
    "Holter de presión arterial (MAPA)",
    "Tamizaje de cáncer cervicouterino",
    "Papanicolau (PAP)",
    "Cotesting (PAP+VPH)",
    "Tamizaje de cáncer colorrectal",
    "Colonoscopía total",
    "Electrocardiograma (ECG)",
    "Espirometría basal y post broncodilatador",
  ]);

  if (imageTests.has(testName)) {
    return "image";
  }

  if (procedureTests.has(testName)) {
    return "procedure";
  }

  return "laboratory";
}

function PrintRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="inline-block min-w-24 text-slate-700">{label}:</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function PrintOrderPage({
  category,
  categoryMeta,
  patient,
  orderDetails,
  pageTests,
  issuedAt,
  verificationCode,
  pageIndex,
  totalPages,
}: {
  category: OrderCategory;
  categoryMeta: ReturnType<typeof getOrderCategoryMeta>;
  patient: CheckupApiRecord["patient"];
  orderDetails: ReturnType<typeof inferOrderDetails>;
  pageTests: CheckupApiRecord["rec"]["tests"];
  issuedAt: string;
  verificationCode: string;
  pageIndex: number;
  totalPages: number;
}) {
  return (
    <article className="veramed-order-page">
      <OrderHeader
        category={category}
        categoryMeta={categoryMeta}
        patient={patient}
        orderDetails={orderDetails}
        issuedAt={issuedAt}
      />
      <BodyExams
        pageTests={pageTests}
        category={category}
        needsFasting={orderDetails.needsFasting}
        issuedAt={issuedAt}
      />
      <OrderFooter
        verificationCode={verificationCode}
        issuedAt={issuedAt}
        pageIndex={pageIndex}
        totalPages={totalPages}
      />
    </article>
  );
}

function OrderHeader({
  category,
  categoryMeta,
  patient,
  orderDetails,
  issuedAt,
}: {
  category: OrderCategory;
  categoryMeta: ReturnType<typeof getOrderCategoryMeta>;
  patient: CheckupApiRecord["patient"];
  orderDetails: ReturnType<typeof inferOrderDetails>;
  issuedAt: string;
}) {
  return (
    <header className="veramed-order-header">
      <div className="flex items-start justify-between gap-6">
        <BrandLogo className="h-20 w-auto" />
        <div className="text-right text-[12px] leading-5">
          <p className="font-semibold text-slate-900">ORDEN MÉDICA DIGITAL</p>
          <p>{issuedAt}</p>
        </div>
      </div>

      <h2 className="mt-3 text-center text-[22px] font-semibold tracking-tight text-slate-900">
        {categoryMeta.printTitle}
      </h2>

      <div className="mt-3 border-y border-slate-300 py-2 text-[12px] leading-5">
        <div className="flex items-start justify-between gap-8">
          <div className="w-[48%] space-y-0.5">
            <PrintRow label="Atención" value={issuedAt.split(",")[0] ?? issuedAt} />
            <PrintRow label="Paciente" value={patient?.fullName || "Paciente Veramed"} />
            <PrintRow label="RUT" value={patient?.rut || "No informado"} />
            <PrintRow label="Dirección" value={patient?.address || "No informada"} />
          </div>
          <div className="w-[48%] space-y-0.5">
            <PrintRow label="Nacimiento" value={formatBirthDate(patient?.birthDate || "")} />
            <PrintRow label="Correo" value={patient?.email || "No informado"} />
            <PrintRow label="Teléfono" value={patient?.phone || "No informado"} />
            <PrintRow
              label="Muestra"
              value={
                category === "laboratory"
                  ? orderDetails.sampleTypeLabel
                  : category === "procedure"
                    ? "Según procedimiento"
                    : "No aplica"
              }
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function BodyExams({
  pageTests,
  category,
  needsFasting,
  issuedAt,
}: {
  pageTests: CheckupApiRecord["rec"]["tests"];
  category: OrderCategory;
  needsFasting: boolean;
  issuedAt: string;
}) {
  return (
    <main className="veramed-order-body pt-3 text-[12px] leading-5">
      <div className="space-y-3">
        {pageTests.map((test) => (
          <div key={test.name} className="veramed-order-item">
            <div className="flex gap-3">
              <span className="mt-0.5 text-sm">•</span>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.01em] text-slate-900">
                  {test.name}
                </p>
                <p className="text-slate-700">
                  Observaciones: {getPreparationNote(test.name, needsFasting, category)}
                </p>
                <p className="text-slate-700">Fecha: {issuedAt.split(",")[0] ?? issuedAt}</p>
                <p className="text-slate-700">Código interno: {buildInternalCode(test.name)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function chunkTestsForPrint(
  tests: CheckupApiRecord["rec"]["tests"],
  category: OrderCategory,
  paperConfig: { bodyHeightMm: number },
) {
  const pages: CheckupApiRecord["rec"]["tests"][] = [];
  let currentPage: CheckupApiRecord["rec"]["tests"] = [];
  let usedHeight = 0;

  tests.forEach((test) => {
    const itemHeight = estimatePrintItemHeightMm(test, category);
    if (currentPage.length > 0 && usedHeight + itemHeight > paperConfig.bodyHeightMm) {
      pages.push(currentPage);
      currentPage = [];
      usedHeight = 0;
    }

    currentPage.push(test);
    usedHeight += itemHeight;
  });

  if (currentPage.length === 0) {
    return [[]];
  }

  pages.push(currentPage);
  return pages;
}

function estimatePrintItemHeightMm(
  test: CheckupApiRecord["rec"]["tests"][number],
  category: OrderCategory,
) {
  const note = getPreparationNote(test.name, false, category);
  const titleLines = Math.max(1, Math.ceil(test.name.length / 40));
  const noteLines = Math.max(1, Math.ceil(`Observaciones: ${note}`.length / 60));
  return 8 + titleLines * 4.5 + noteLines * 4 + 8;
}

function OrderFooter({
  verificationCode,
  issuedAt,
  pageIndex,
  totalPages,
}: {
  verificationCode: string;
  issuedAt: string;
  pageIndex: number;
  totalPages: number;
}) {
  return (
    <footer className="veramed-order-footer border-t border-slate-300 pt-3 text-[11px] text-slate-600">
      <div className="grid grid-cols-[1fr_0.9fr_1.15fr] items-end gap-x-5">
        <div className="self-center">
          <p className="font-semibold text-slate-800">Código de verificación</p>
          <p>{verificationCode}</p>
          <p className="mt-1 font-semibold text-slate-800">Fecha de emisión</p>
          <p>{issuedAt}</p>
        </div>

        <div className="self-center text-center">
          <p className="font-semibold text-slate-800">veramed.cl</p>
          <p>Página {pageIndex + 1} de {totalPages}</p>
        </div>

        <div className="justify-self-end text-right">
          <div className="ml-auto flex h-14 w-52 items-end justify-end border-b border-slate-500">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/firmas/firma-VRM.png"
              alt="Firma Dr. Víctor Rebolledo"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
              className="h-12 w-36 object-contain"
            />
          </div>
          <p className="mt-1 text-[12px] text-slate-700">Dr. Víctor Rebolledo M.</p>
          <p className="text-[12px] text-slate-700">RUT 18.856.820-3</p>
          <p className="text-[12px] text-slate-700">Registro SIS N°611341</p>
        </div>
      </div>
    </footer>
  );
}

function getPreparationNote(testName: string, needsFasting: boolean, category: OrderCategory) {
  if (category === "image") {
    return "Verifica con el centro si requiere preparación específica antes del examen.";
  }

  if (category === "procedure") {
    return "Requiere coordinación e indicaciones específicas según el procedimiento.";
  }

  const lowerName = testName.toLowerCase();
  if (lowerName.includes("orina")) {
    return "Idealmente usar muestra de la mañana.";
  }
  if (
    needsFasting &&
    (lowerName.includes("glicemia") || lowerName.includes("perfil lip") || lowerName.includes("hba1c"))
  ) {
    return "Requiere ayuno de 8 horas.";
  }
  return "No requiere preparación especial.";
}

function buildInternalCode(testName: string) {
  const base = testName
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  return `VM-${base.padEnd(6, "0")}`;
}
