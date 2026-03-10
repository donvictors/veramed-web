"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { getFonasaCodeByExamName } from "@/lib/fonasa-codes";
import { getOrderCategoryByTestName, type OrderCategory } from "@/lib/order-categories";

type TestItem = {
  name: string;
  why: string;
};

type SymptomsOrderDraft = {
  id: string;
  issuedAtMs: number;
  verificationCode: string;
  summary: string;
  symptomsText: string;
  interpretation: {
    primarySymptom: string;
    probableContext: string;
    consultationFrame: string;
    tags: string[];
  };
  answers: {
    evolution?: string;
    intensity?: string;
    associated?: string;
    background?: string;
  };
  tests: TestItem[];
  notes: string[];
};

type AuthMeResponse = {
  authenticated: boolean;
  user: {
    name: string;
    profile?: {
      email?: string;
    };
    email?: string;
  } | null;
};

const STORAGE_KEY = "veramed_symptoms_order_v1";
const ORDER_CATEGORIES: OrderCategory[] = ["laboratory", "image", "procedure", "interconsultation"];

function getCategoryLabel(category: OrderCategory) {
  if (category === "image") return "Imágenes";
  if (category === "procedure") return "Procedimientos";
  if (category === "interconsultation") return "Interconsulta";
  return "Laboratorio";
}

function getPreparationNote(testName: string, category: OrderCategory) {
  if (category === "image") {
    return "Verifica con el centro si requiere preparación específica.";
  }
  if (category === "procedure") {
    return "Requiere coordinación previa con el centro de atención.";
  }
  if (category === "interconsultation") {
    return "Corresponde a evaluación por especialista.";
  }
  const lower = testName.toLowerCase();
  if (lower.includes("orina")) return "Idealmente usar muestra de la mañana.";
  if (lower.includes("perfil lip") || lower.includes("glucosa")) return "Ayuno de 8 horas recomendado.";
  return "No requiere preparación especial.";
}

export default function SymptomsOrderPage() {
  const [order, setOrder] = useState<SymptomsOrderDraft | null>(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState("");

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setOrder(null);
        return;
      }
      setOrder(JSON.parse(raw) as SymptomsOrderDraft);
    } catch {
      setOrder(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json() as Promise<AuthMeResponse>)
      .then((payload) => {
        if (!active) return;
        const nextEmail = payload?.user?.profile?.email || payload?.user?.email || "";
        if (nextEmail) setEmail(nextEmail);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const categorized = useMemo(() => {
    if (!order) {
      return {
        laboratory: [] as TestItem[],
        image: [] as TestItem[],
        procedure: [] as TestItem[],
        interconsultation: [] as TestItem[],
      };
    }
    return {
      laboratory: order.tests.filter((test) => getOrderCategoryByTestName(test.name) === "laboratory"),
      image: order.tests.filter((test) => getOrderCategoryByTestName(test.name) === "image"),
      procedure: order.tests.filter((test) => getOrderCategoryByTestName(test.name) === "procedure"),
      interconsultation: order.tests.filter(
        (test) => getOrderCategoryByTestName(test.name) === "interconsultation",
      ),
    };
  }, [order]);

  async function handleSendEmail() {
    if (!order || !email.trim() || sending) return;

    setSending(true);
    setEmailFeedback("");
    try {
      const response = await fetch("/api/sintomas/send-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          orderId: order.id,
          verificationCode: order.verificationCode,
          orderLink: `${window.location.origin}/sintomas/orden`,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "No pudimos enviar el correo.");
      }
      setEmailFeedback("Orden enviada correctamente a tu correo.");
    } catch (error) {
      setEmailFeedback(error instanceof Error ? error.message : "No pudimos enviar el correo.");
    } finally {
      setSending(false);
    }
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-14">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Orden por síntomas</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              No encontramos una orden para mostrar
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Debes completar el flujo de síntomas y generar la orden primero.
            </p>
            <Link
              href="/sintomas"
              className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Volver a síntomas
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 print:bg-white">
      <div className="mx-auto max-w-5xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)] print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6 print:hidden">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Orden por síntomas
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Resumen de orden de exámenes
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">{order.summary}</p>
              <p className="mt-2 text-xs text-slate-500">ID referencia: {order.verificationCode}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              >
                Descargar PDF
              </button>
              <Link href="/sintomas/flujo" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">
                Volver al flujo
              </Link>
            </div>
          </div>

          <div className="print:px-8 print:pt-8">
            <BrandLogo className="h-20 w-auto" />
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Orden médica de exámenes</h2>
            <p className="mt-2 text-sm text-slate-600">
              Documento generado mediante tecnología de evaluación de síntomas de Veramed © y validación técnica por médico firmante.
            </p>

            <div className="mt-6 grid gap-3 text-sm md:grid-cols-2">
              <Info label="Motivo clínico orientador" value={order.interpretation.probableContext} />
              <Info label="Síntoma principal" value={order.interpretation.primarySymptom} />
              <Info label="Código de verificación" value={order.verificationCode} />
              <Info
                label="Fecha y hora"
                value={new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(
                  new Date(order.issuedAtMs),
                )}
              />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tu relato</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">Antecedentes médicos: {order.answers.evolution || "No informado"}</p>
              <p className="text-sm leading-7 text-slate-700">Antecedentes quirúrgicos: {order.answers.intensity || "No informado"}</p>
              <p className="text-sm leading-7 text-slate-700">Fármacos: {order.answers.associated || "No informado"}</p>
              <p className="text-sm leading-7 text-slate-700">Alergias: {order.answers.background || "No informado"}</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">Síntomas del paciente: {order.symptomsText}</p>
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-700">Examen</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Observaciones</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Códigos FONASA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {ORDER_CATEGORIES.map((category) => {
                    const tests = categorized[category];
                    if (tests.length === 0) return null;
                    return (
                      <Fragment key={`group-${category}`}>
                        <tr className="bg-slate-100">
                          <td colSpan={3} className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                            {getCategoryLabel(category)}
                          </td>
                        </tr>
                        {tests.map((test) => (
                          <tr key={`${category}-${test.name}`}>
                            <td className="px-4 py-3 font-semibold text-slate-900">{test.name}</td>
                            <td className="px-4 py-3 text-slate-600">
                              {getPreparationNote(test.name, category)}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{getFonasaCodeByExamName(test.name)}</td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid gap-6 border-t border-slate-200 pt-6 md:grid-cols-2 print:hidden">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Enviar orden por correo</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="correo@paciente.cl"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    disabled={!email.trim() || sending}
                    className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {sending ? "Enviando..." : "Enviar"}
                  </button>
                </div>
                {emailFeedback ? <p className="mt-2 text-xs text-slate-600">{emailFeedback}</p> : null}
              </div>

              <div className="rounded-3xl bg-slate-950 p-5 text-white">
                <p className="text-sm font-semibold">Advertencia de uso</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  Los resultados deben interpretarse en contexto clínico y no sustituyen evaluación
                  médica presencial ante síntomas de urgencia.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
