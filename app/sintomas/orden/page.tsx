"use client";

import { Fragment, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import {
  calculateAgeFromBirthDate,
  formatBirthDate,
  inferOrderDetails,
  type TestItem,
} from "@/lib/checkup";
import { getExamObservationForOrder } from "@/lib/exam-master-catalog";
import { getFonasaCodeByExamName } from "@/lib/fonasa-codes";
import {
  getOrderCategoryByTestName,
  getOrderCategoryMeta,
  parseOrderCategory,
  type OrderCategory,
} from "@/lib/order-categories";
import type { SymptomsOrderDraft } from "@/lib/symptoms-order";

const STORAGE_KEY = "veramed_symptoms_order_v1";
const ORDER_CATEGORIES: OrderCategory[] = [
  "laboratory",
  "image",
  "procedure",
  "interconsultation",
];
const LETTER_PRINT_CONFIG = {
  cssSize: "letter portrait",
  contentHeightMm: 257.4,
  bodyHeightMm: 164,
};

function readOrderFromStorage() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SymptomsOrderDraft;
  } catch {
    return null;
  }
}

function SymptomsOrderPageContent() {
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<SymptomsOrderDraft | null>(() => readOrderFromStorage());
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<OrderCategory>("laboratory");

  const requestedCategory = parseOrderCategory(searchParams.get("printCategory") || null);
  const requestIdFromUrl = searchParams.get("id")?.trim() || "";

  useEffect(() => {
    if (!requestIdFromUrl) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/sintomas/orders/${requestIdFromUrl}`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | { order?: SymptomsOrderDraft; error?: string }
          | null;
        if (!response.ok || !payload?.order) {
          throw new Error(payload?.error || "No encontramos la orden solicitada.");
        }

        if (cancelled) return;
        setOrder(payload.order);
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload.order));
      } catch {
        if (cancelled) return;
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestIdFromUrl]);

  if (!order && !loading) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <h1 className="text-2xl font-semibold">No hay orden para mostrar</h1>
          <p className="mt-2 text-slate-600">
            Vuelve al flujo de síntomas y genera la orden primero.
          </p>
          <Link
            href="/sintomas/flujo"
            className="mt-6 inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm text-white"
          >
            Volver al flujo
          </Link>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <h1 className="text-2xl font-semibold">Cargando orden...</h1>
        </div>
      </main>
    );
  }

  const categorizedTests = categorizeSymptomsTests(order.tests);
  const allTests = order.tests;
  const laboratoryTests = categorizedTests.laboratory;
  const availableCategories = ORDER_CATEGORIES.filter(
    (category) => categorizedTests[category].length > 0,
  );
  const printCategory =
    availableCategories.find((category) => category === (requestedCategory ?? selectedCategory)) ??
    availableCategories[0] ??
    "laboratory";
  const printTests = categorizedTests[printCategory];
  const displayOrderDetails = inferOrderDetails(
    laboratoryTests.length > 0 ? laboratoryTests : allTests,
  );
  const printOrderDetails = inferOrderDetails(printTests);
  const printCategoryMeta = getOrderCategoryMeta(printCategory);
  const printPages = chunkTestsForPrint(printTests, printCategory, LETTER_PRINT_CONFIG);
  const issuedAt = new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(order.issuedAtMs));
  const patientAge = calculateAgeFromBirthDate(order.patient.birthDate || "");
  const isValidated = order.reviewStatus === "validated";
  const statusLabel = isValidated ? "Aprobada" : "Pendiente validación";

  function handlePrint(category: OrderCategory) {
    setSelectedCategory(category);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.print();
      });
    });
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
              Te enviaremos las órdenes a tu correo (recuerda revisar tu bandeja de spam) una vez
              que un médico de nuestro equipo las valide y firme.
              <br />
              Por mientras, puedes verlas (sin firmar) haciendo clic en los recuadros de la
              derecha . 😉
            </p>
            <p className="mt-1 text-right text-[11px] text-slate-600">
              ID de referencia: {order.verificationCode}
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
                href="/sintomas/flujo"
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Volver
              </Link>
            </div>
          </div>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)] print:hidden">
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-6">
            <div>
              <BrandLogo className="h-28 w-auto" />
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Orden médica de exámenes
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Documento generado mediante tecnología de flujo de síntomas de Veramed © y
                {isValidated
                  ? " validación técnica por médico firmante."
                  : " pendiente de validación y firma médica."}
              </p>
            </div>

            <div className="grid gap-3 text-sm sm:min-w-72 sm:grid-cols-2">
              <MetaRow label="ID" value={order.verificationCode} />
              <MetaRow label="Fecha y hora" value={issuedAt} />
              <MetaRow label="Estado" value={statusLabel} />
              <MetaRow label="Ciudad de referencia" value="Santiago, Chile" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm md:grid-cols-2">
            <Info label="Nombre" value={order.patient.fullName || "No informado"} />
            <Info label="RUT" value={order.patient.rut || "No informado"} />
            <Info label="Fecha de nacimiento" value={formatBirthDate(order.patient.birthDate || "")} />
            <Info label="Correo" value={order.patient.email || "No informado"} />
            <Info label="Teléfono" value={order.patient.phone || "No informado"} />
            <Info label="Dirección" value={order.patient.address || "No informada"} />
            <Info label="Edad" value={patientAge > 0 ? `${patientAge}` : "No informada"} />
            <Info label="Sexo" value="No informado" />
            <Info label="Peso" value="No informado" />
            <Info label="Talla" value="No informado" />
            <Info label="Tabaco" value="No informado" />
            <Info label="Actividad sexual" value="No informada" />
          </div>

          <div className="mt-8 rounded-3xl bg-slate-50 p-5">
            <div className="grid gap-4 md:grid-cols-4">
              <SummaryCell label="Exámenes" value={`${allTests.length}`} />
              <SummaryCell
                label="Ayuno"
                value={
                  laboratoryTests.length > 0 ? (displayOrderDetails.needsFasting ? "Sí" : "No") : "No aplica"
                }
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
              Se identificaron {allTests.length} exámenes según la evaluación clínica guiada por
              síntomas.
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
                    <th className="px-4 py-3 font-semibold text-slate-700">
                      Examen / procedimiento
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-700">
                      Justificación clínica
                    </th>
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
                  : ["Confirma con el centro si requiere preparación específica antes de asistir."]).map(
                  (item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{item}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>

          {order.notes.length > 0 && (
            <div className="mt-8 rounded-3xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Observaciones adicionales</p>
              <ul className="mt-3 grid gap-2 text-sm text-slate-700">
                {order.notes.map((note, idx) => (
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
              {isValidated ? (
                <>
                  <p className="mt-2 text-sm font-medium text-slate-700">Dr. Víctor Rebolledo M.</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    RUT 18.856.820-3 / RCM 46129-6 / SIS N°611341
                    <br />
                    Médico staff de Veramed.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-700">
                  Pendiente de validación por médico acreditado.
                </p>
              )}
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
              patient={order.patient}
              orderDetails={printOrderDetails}
              pageTests={pageTests}
              issuedAt={issuedAt}
              verificationCode={order.verificationCode}
              pageIndex={pageIndex}
              totalPages={printPages.length}
              showSignature={isValidated}
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

function SymptomsOrderLoadingFallback() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Cargando orden...</h1>
      </div>
    </main>
  );
}

export default function SymptomsOrderPage() {
  return (
    <Suspense fallback={<SymptomsOrderLoadingFallback />}>
      <SymptomsOrderPageContent />
    </Suspense>
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

function categorizeSymptomsTests(tests: TestItem[]) {
  return {
    laboratory: tests.filter((test) => getOrderCategoryByTestName(test.name) === "laboratory"),
    image: tests.filter((test) => getOrderCategoryByTestName(test.name) === "image"),
    procedure: tests.filter((test) => getOrderCategoryByTestName(test.name) === "procedure"),
    interconsultation: tests.filter(
      (test) => getOrderCategoryByTestName(test.name) === "interconsultation",
    ),
  };
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
  showSignature,
}: {
  category: OrderCategory;
  categoryMeta: ReturnType<typeof getOrderCategoryMeta>;
  patient: SymptomsOrderDraft["patient"];
  orderDetails: ReturnType<typeof inferOrderDetails>;
  pageTests: TestItem[];
  issuedAt: string;
  verificationCode: string;
  pageIndex: number;
  totalPages: number;
  showSignature: boolean;
}) {
  return (
    <article className="veramed-order-page">
      <OrderHeader categoryMeta={categoryMeta} patient={patient} issuedAt={issuedAt} />
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
        showSignature={showSignature}
      />
    </article>
  );
}

function OrderHeader({
  categoryMeta,
  patient,
  issuedAt,
}: {
  categoryMeta: ReturnType<typeof getOrderCategoryMeta>;
  patient: SymptomsOrderDraft["patient"];
  issuedAt: string;
}) {
  const age = calculateAgeFromBirthDate(patient?.birthDate || "");
  return (
    <header className="veramed-order-header">
      <div className="flex items-start justify-between gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/veramed-logo.png"
          alt="Veramed"
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          className="veramed-print-logo h-20 w-auto object-contain"
        />
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
            <PrintRow label="Paciente" value={patient?.fullName || "Paciente Veramed"} />
            <PrintRow label="RUT" value={patient?.rut || "No informado"} />
            <PrintRow label="Dirección" value={patient?.address || "No informada"} />
          </div>
          <div className="w-[48%] space-y-0.5">
            <PrintRow label="Edad" value={age > 0 ? `${age} años` : "No informada"} />
            <PrintRow label="Correo" value={patient?.email || "No informado"} />
            <PrintRow label="Teléfono" value={patient?.phone || "No informado"} />
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
  pageTests: TestItem[];
  category: OrderCategory;
  needsFasting: boolean;
  issuedAt: string;
}) {
  return (
    <main className="veramed-order-body pt-3 text-[12px] leading-5">
      <div className="space-y-3">
        {category === "interconsultation" && (
          <div className="veramed-order-item rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[12px] font-semibold text-slate-900">
              Se solicita derivación a: Oftalmólogo/a
            </p>
          </div>
        )}

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
                <p className="text-slate-700">
                  Códigos FONASA: {getFonasaCodeByExamName(test.name)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function chunkTestsForPrint(
  tests: TestItem[],
  category: OrderCategory,
  paperConfig: { bodyHeightMm: number },
) {
  const pages: TestItem[][] = [];
  let currentPage: TestItem[] = [];
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

function estimatePrintItemHeightMm(test: TestItem, category: OrderCategory) {
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
  showSignature,
}: {
  verificationCode: string;
  issuedAt: string;
  pageIndex: number;
  totalPages: number;
  showSignature: boolean;
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
          <p>
            Página {pageIndex + 1} de {totalPages}
          </p>
        </div>

        <div className="justify-self-end text-right">
          <div className="ml-auto flex h-14 w-52 items-end justify-end border-b border-slate-500">
            {showSignature ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/firmas/firma-VRM.png"
                  alt="Firma Dr. Víctor Rebolledo"
                  loading="eager"
                  decoding="sync"
                  fetchPriority="high"
                  className="veramed-print-signature h-12 w-36 object-contain"
                />
              </>
            ) : null}
          </div>
          {showSignature ? (
            <>
              <p className="mt-1 text-[12px] text-slate-700">Dr. Víctor Rebolledo M.</p>
              <p className="text-[12px] text-slate-700">RUT 18.856.820-3</p>
              <p className="text-[12px] text-slate-700">Registro SIS N°611341</p>
            </>
          ) : (
            <p className="mt-2 text-[12px] text-slate-700">Pendiente de firma médica</p>
          )}
        </div>
      </div>
    </footer>
  );
}

function getPreparationNote(testName: string, needsFasting: boolean, category: OrderCategory) {
  return getExamObservationForOrder(testName, { needsFasting, category });
}
