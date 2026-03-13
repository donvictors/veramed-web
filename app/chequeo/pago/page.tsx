"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Stepper from "@/components/checkup/Stepper";
import {
  fetchCheckupRequest,
  type CheckupApiRecord,
} from "@/lib/checkup-api";
import {
  CHECKUP_PRICE_CLP,
  inferOrderDetails,
} from "@/lib/checkup";
import { calculateDiscountedAmount, getDiscountByCode } from "@/lib/discount-codes";
import { useRequestId } from "@/lib/use-request-id";

export default function PaymentPage() {
  const router = useRouter();
  const [data, setData] = useState<CheckupApiRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [appliedDiscountCode, setAppliedDiscountCode] = useState("");
  const createRequestLockRef = useRef(false);
  const { requestId, resolved } = useRequestId();

  useEffect(() => {
    if (!resolved) {
      return;
    }

    if (!requestId) {
      router.replace("/mi-cuenta");
      return;
    }

    void fetchCheckupRequest(requestId)
      .then((checkup) => {
        startTransition(() => {
          setData(checkup);
        });
      })
      .catch(() => {
        router.replace("/mi-cuenta");
      });
  }, [requestId, resolved, router]);

  const orderDetails = useMemo(
    () => (data ? inferOrderDetails(data.rec.tests) : null),
    [data],
  );
  const pricing = useMemo(
    () => calculateDiscountedAmount(CHECKUP_PRICE_CLP, appliedDiscountCode),
    [appliedDiscountCode],
  );

  async function handlePayment() {
    if (createRequestLockRef.current || isSubmitting) {
      return;
    }

    if (!data || !requestId) {
      return;
    }

    try {
      createRequestLockRef.current = true;
      setIsSubmitting(true);
      setSubmitError("");

      const response = await fetch("/api/payments/transbank/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: requestId,
          sessionId: `checkup-${requestId}`,
          amount: pricing.finalAmount,
          discountCode: appliedDiscountCode || undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { redirectUrl?: string; error?: string }
        | null;

      if (!response.ok || !payload?.redirectUrl) {
        throw new Error(payload?.error || "No pudimos iniciar el pago en Webpay.");
      }

      window.location.href = payload.redirectUrl;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No pudimos iniciar el pago.");
    } finally {
      createRequestLockRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (!data || !orderDetails) return null;

  function handleApplyDiscount() {
    const normalized = discountCode.trim().toUpperCase();
    if (!normalized) {
      setAppliedDiscountCode("");
      setDiscountError("");
      return;
    }

    const discount = getDiscountByCode(normalized);
    if (!discount) {
      setAppliedDiscountCode("");
      setDiscountError("Código no válido");
      return;
    }

    setAppliedDiscountCode(discount.code);
    setDiscountError("");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Pago seguro
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Confirma el pago antes de emitir la orden.
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            El pago habilita la validación clínica y la posterior descarga de la orden médica.
          </p>
        </div>

        <div className="mt-8">
          <Stepper currentStep={2} />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Resumen de cobro
            </p>
            <div className="mt-5 rounded-3xl bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Chequeo preventivo Veramed</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Incluye {orderDetails.includedCount} exámenes, preparación y orden validada.
                  </p>
                </div>
                <div className="text-right">
                  {pricing.discount ? (
                    <p className="text-sm font-medium text-slate-500 line-through">
                      ${pricing.baseAmount.toLocaleString("es-CL")}
                    </p>
                  ) : null}
                  <p className="text-2xl font-semibold text-slate-950">
                    ${pricing.finalAmount.toLocaleString("es-CL")}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <SummaryRow label="Ayuno" value={orderDetails.needsFasting ? "Sí" : "No"} />
              <SummaryRow label="Tipo de muestra" value={orderDetails.sampleTypeLabel} />
              <SummaryRow label="Vigencia sugerida" value="60 días" />
              <SummaryRow label="Cobro" value="Pago único por emisión clínica" />
              {pricing.discount ? (
                <SummaryRow
                  label="Descuento aplicado"
                  value={`${pricing.discount.label} (-$${pricing.discountAmount.toLocaleString("es-CL")})`}
                />
              ) : null}
            </div>

            <Link
              href={`/chequeo/resumen?id=${data.id}`}
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
              Pago con tus tarjetas de débito o crédito.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Serás redirigido a Webpay Plus para pagar de forma segura.
            </p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Código de descuento
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  value={discountCode}
                  onChange={(event) => {
                    setDiscountCode(event.target.value.toUpperCase());
                    setDiscountError("");
                    if (appliedDiscountCode) {
                      setAppliedDiscountCode("");
                    }
                  }}
                  placeholder="Ingresa tu código"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
                <button
                  type="button"
                  onClick={handleApplyDiscount}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                >
                  Aplicar
                </button>
              </div>
              {discountError ? (
                <p className="mt-2 text-xs font-medium text-rose-600">{discountError}</p>
              ) : null}
              {pricing.discount ? (
                <p className="mt-2 text-xs font-medium text-emerald-700">
                  Código aplicado. Nuevo total: ${pricing.finalAmount.toLocaleString("es-CL")}
                </p>
              ) : null}
            </div>

            <button
              onClick={handlePayment}
              disabled={isSubmitting}
              className="mt-6 mx-auto flex w-full max-w-[560px] items-center justify-center rounded-2xl border-2 border-slate-300 bg-slate-50 px-5 py-4 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.5)] ring-1 ring-slate-200/70 transition hover:border-slate-400 hover:bg-white hover:shadow-[0_14px_32px_-20px_rgba(15,23,42,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Pagar con Webpay Plus"
            >
              <Image
                src="/brand/webpay-plus.svg"
                alt="Webpay Plus Transbank"
                width={250}
                height={62}
                className="h-auto w-[200px] md:w-[250px]"
                priority
              />
            </button>

            <p className="mt-3 text-xs font-medium text-slate-500">
              {isSubmitting ? "Redirigiendo a Webpay..." : "Haz clic para pagar con tarjeta."}
            </p>

            {submitError && (
              <p className="mt-3 text-xs leading-5 text-rose-600">{submitError}</p>
            )}

            <div className="mt-4 flex justify-end">
              <Image
                src="/brand/ssl-secured.svg"
                alt="SSL Secured"
                width={160}
                height={60}
                className="h-auto w-[110px] opacity-90"
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
