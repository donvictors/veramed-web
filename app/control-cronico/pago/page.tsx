"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Stepper from "@/components/checkup/Stepper";
import {
  createPaymentId,
  type StoredPayment,
} from "@/lib/checkup";
import {
  CHRONIC_CONTROL_PRICE_CLP,
  conditionLabel,
  medicationLabel,
  type StoredChronicControl,
} from "@/lib/chronic-control";

export default function ChronicControlPaymentPage() {
  const router = useRouter();
  const [data, setData] = useState<StoredChronicControl | null>(null);
  const [payment, setPayment] = useState<StoredPayment | null>(null);
  const [cardholder, setCardholder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [billingId, setBillingId] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("veramed_chronic_control");
    if (!raw) {
      router.replace("/control-cronico");
      return;
    }

    const parsed = JSON.parse(raw) as StoredChronicControl;
    const storedPayment = localStorage.getItem("veramed_chronic_payment");

    startTransition(() => {
      setData(parsed);
      if (storedPayment) {
        setPayment(JSON.parse(storedPayment) as StoredPayment);
      }
    });
  }, [router]);

  function handlePayment() {
    const normalizedCard = cardNumber.replace(/\D/g, "");
    const last4 = normalizedCard.slice(-4);

    if (
      !data ||
      cardholder.trim().length < 3 ||
      normalizedCard.length < 16 ||
      expiry.trim().length < 4 ||
      cvv.trim().length < 3 ||
      billingId.trim().length < 6
    ) {
      return;
    }

    const paymentRecord: StoredPayment = {
      paid: true,
      amount: CHRONIC_CONTROL_PRICE_CLP,
      currency: "CLP",
      paidAt: Date.now(),
      paymentId: createPaymentId(),
      cardLast4: last4,
      cardholder: cardholder.trim(),
    };

    localStorage.setItem("veramed_chronic_payment", JSON.stringify(paymentRecord));
    setPayment(paymentRecord);
  }

  if (!data) return null;

  if (payment?.paid) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Pago confirmado
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              El pago de tu orden de control fue procesado correctamente.
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              ID de pago: {payment.paymentId}. Puedes volver al resumen para revisar la orden
              solicitada.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/control-cronico/resumen"
                className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Volver al resumen
              </Link>
              <Link
                href="/control-cronico"
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Nuevo control
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

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
              href="/control-cronico/resumen"
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
              className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Pagar orden de control
            </button>
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
