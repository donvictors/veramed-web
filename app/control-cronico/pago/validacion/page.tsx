"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Stepper from "@/components/checkup/Stepper";
import { confirmChronicPayment, fetchChronicControlRequest } from "@/lib/chronic-control-api";

export default function ChronicPaymentValidationPage() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(3);
  const requestId =
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("id");

  useEffect(() => {
    if (!requestId) {
      router.replace("/control-cronico/pago");
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    const confirmPayment = setTimeout(() => {
      void fetchChronicControlRequest(requestId)
        .then(() => confirmChronicPayment(requestId))
        .then(() => {
          router.push(`/control-cronico/estado?id=${requestId}`);
        })
        .catch(() => {
          router.replace(`/control-cronico/pago?id=${requestId}`);
        });
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(confirmPayment);
    };
  }, [requestId, router]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-10 md:py-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Validación de pago
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Estamos confirmando tu pago.
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Después de validar el pago, te llevaremos al estado de emisión de tu orden de control.
          </p>
        </div>

        <div className="mt-8">
          <Stepper currentStep={3} />
        </div>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Pago en validación</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Confirmando transacción. Tiempo estimado restante:
              <span className="font-semibold text-slate-900"> {secondsLeft}s</span>.
            </p>
            <div className="mt-5 h-2 w-full rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-slate-950 transition-[width]"
                style={{ width: `${((3 - secondsLeft) / 3) * 100}%` }}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
