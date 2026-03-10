"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

const SYMPTOMS_PRICE_CLP = 5990;
const SYMPTOMS_STORAGE_KEY = "veramed_symptoms_intake_v1";

function buildClientOrderId() {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 46656)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0");
  return `symp_${now}${rand}`.slice(0, 26);
}

function SymptomsPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const requestLockRef = useRef(false);

  const orderId = useMemo(() => buildClientOrderId(), []);
  const paymentError = searchParams.get("error");

  useEffect(() => {
    const draft = window.sessionStorage.getItem(SYMPTOMS_STORAGE_KEY);
    if (!draft) {
      router.replace("/sintomas");
    }
  }, [router]);

  useEffect(() => {
    if (!paymentError) {
      return;
    }

    if (paymentError === "rejected") {
      setSubmitError("Tu pago fue rechazado por Transbank. Puedes intentarlo nuevamente.");
      return;
    }

    if (paymentError === "missing-token") {
      setSubmitError("No recibimos el token de pago. Inténtalo nuevamente desde esta pantalla.");
      return;
    }

    setSubmitError("No pudimos confirmar el pago con Transbank. Vuelve a intentarlo.");
  }, [paymentError]);

  async function handlePayment() {
    if (requestLockRef.current || isSubmitting) {
      return;
    }

    try {
      requestLockRef.current = true;
      setIsSubmitting(true);
      setSubmitError("");

      const response = await fetch("/api/sintomas/payments/create", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          sessionId: `symptoms-${orderId}`,
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
      requestLockRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-10 md:py-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Pago seguro
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Confirma tu pago
            <br />
            y continúa con la evaluación de tus síntomas.
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Al validar el pago, te llevaremos al flujo clínico guiado para continuar con tu orden.
          </p>
          <p className="mt-2 text-sm font-medium text-slate-700">
            Monto a cobrar:{" "}
            <span className="font-semibold text-slate-900">${SYMPTOMS_PRICE_CLP.toLocaleString("es-CL")}</span>
            .
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Resumen de cobro
            </p>
            <div className="mt-5 rounded-3xl bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Evaluación de síntomas Veramed</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Incluye interpretación inicial, flujo guiado y emisión de orden sujeta a revisión
                    médica.
                  </p>
                </div>
                <p className="text-2xl font-semibold text-slate-950">
                  ${SYMPTOMS_PRICE_CLP.toLocaleString("es-CL")}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <SummaryRow label="Cobro" value="Pago único por evaluación clínica guiada" />
              <SummaryRow label="Monto" value={`$${SYMPTOMS_PRICE_CLP.toLocaleString("es-CL")}`} />
              <SummaryRow label="Pasarela" value="Webpay Plus (Transbank)" />
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Incluye
              </p>
              <div className="mt-3 grid gap-2 text-sm text-slate-700">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-600">✓</span>
                  <span>Evaluación guiada de síntomas</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-600">✓</span>
                  <span>Sugerencia de exámenes para tu consulta</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-600">✓</span>
                  <span>Revisión médica</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-600">✓</span>
                  <span>Orden firmada si corresponde</span>
                </div>
              </div>
              <div className="mt-4 inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                ⏱ Entrega dentro de 12 horas
              </div>
            </div>

            <Link
              href="/sintomas"
              className="mt-6 inline-flex text-sm font-semibold text-slate-700 transition hover:text-slate-950"
            >
              Volver a síntomas
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

            {submitError ? <p className="mt-3 text-xs leading-5 text-rose-600">{submitError}</p> : null}

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

export default function SymptomsPaymentPage() {
  return (
    <Suspense fallback={null}>
      <SymptomsPaymentContent />
    </Suspense>
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
