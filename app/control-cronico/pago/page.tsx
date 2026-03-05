"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Stepper from "@/components/checkup/Stepper";
import {
  createChronicPendingPayment,
  fetchChronicControlRequest,
  type ChronicControlApiRecord,
} from "@/lib/chronic-control-api";
import {
  createPaymentId,
  type StoredPayment,
} from "@/lib/checkup";
import {
  CHRONIC_CONTROL_PRICE_CLP,
  conditionLabel,
  medicationLabel,
} from "@/lib/chronic-control";

export default function ChronicControlPaymentPage() {
  const router = useRouter();
  const [data, setData] = useState<ChronicControlApiRecord | null>(null);
  const [cardholder, setCardholder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [billingId, setBillingId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const requestId =
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("id");

  useEffect(() => {
    if (!requestId) {
      router.replace("/mi-cuenta");
      return;
    }

    void fetchChronicControlRequest(requestId)
      .then((request) => {
        startTransition(() => {
          setData(request);
        });
      })
      .catch(() => {
        router.replace("/mi-cuenta");
      });
  }, [requestId, router]);

  async function handlePayment() {
    const normalizedCard = cardNumber.replace(/\D/g, "") || "4242424242424242";
    const last4 = normalizedCard.slice(-4);

    if (!data || !requestId) {
      return;
    }

    const paymentRecord: Omit<StoredPayment, "paid" | "paidAt"> = {
      amount: CHRONIC_CONTROL_PRICE_CLP,
      currency: "CLP",
      paymentId: createPaymentId(),
      cardLast4: last4,
      cardholder: cardholder.trim() || "Pago de prueba Veramed",
    };

    try {
      setIsSubmitting(true);
      setSubmitError("");
      await createChronicPendingPayment(requestId, paymentRecord);
      router.push(`/control-cronico/pago/validacion?id=${requestId}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No pudimos iniciar el pago.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!data) return null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Pago seguro
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Revisa el resumen antes de pagar tu orden de control.
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Este paso confirma el detalle clínico y el cobro antes de emitir la orden.
          </p>
        </div>

        <div className="mt-8">
          <Stepper currentStep={3} />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Resumen previo a pagar
            </p>
            <div className="mt-5 rounded-3xl bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Control crónico Veramed</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {data.conditions.map(conditionLabel).join(", ")}
                  </p>
                </div>
                <p className="text-2xl font-semibold text-slate-950">
                  ${CHRONIC_CONTROL_PRICE_CLP.toLocaleString("es-CL")}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <SummaryRow label="Condiciones" value={`${data.conditions.length}`} />
              <SummaryRow label="Exámenes" value={`${data.rec.tests.length}`} />
              <SummaryRow
                label="Tratamientos declarados"
                value={
                  data.usesMedication && data.selectedMedications.length > 0
                    ? data.selectedMedications.map(medicationLabel).join(", ")
                    : "Ninguno"
                }
              />
              <SummaryRow label="Cobro" value="Pago único por emisión clínica" />
            </div>

            <Link
              href={`/control-cronico/resumen?id=${data.id}`}
              className="mt-6 inline-flex text-sm font-semibold text-slate-700 transition hover:text-slate-950"
            >
              Volver al resumen
            </Link>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Pasarela de pago
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Completa tus datos de facturación.
            </h2>

            <div className="mt-6 grid gap-5">
              <Field label="Nombre del titular">
                <input className={inputCls} value={cardholder} onChange={(e) => setCardholder(e.target.value)} placeholder="Nombre y apellido" />
              </Field>
              <Field label="RUT o identificador de facturación">
                <input className={inputCls} value={billingId} onChange={(e) => setBillingId(e.target.value)} placeholder="12.345.678-9" />
              </Field>
              <Field label="Número de tarjeta">
                <input className={inputCls} inputMode="numeric" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="1234 5678 9012 3456" />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Vencimiento">
                  <input className={inputCls} value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="MM/AA" />
                </Field>
                <Field label="CVV">
                  <input className={inputCls} inputMode="numeric" value={cvv} onChange={(e) => setCvv(e.target.value)} placeholder="123" />
                </Field>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={isSubmitting}
              className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Procesando..." : "Pagar orden de control"}
            </button>

            {submitError && (
              <p className="mt-3 text-xs leading-5 text-rose-600">{submitError}</p>
            )}

            <p className="mt-3 text-xs leading-5 text-slate-500">
              Pago simulado para demo. Al confirmar, avanzas a validación de pago y luego al estado
              de emisión clínica.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-900">{label}</span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
