"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { TestItem } from "@/lib/checkup";

type RequestDetailPayload = {
  request: {
    id: string;
    reviewStatus: "pending_validation" | "validated" | "draft" | "paid" | "in_flow" | "rejected";
    symptomsText: string;
    oneLinerSummary: string;
    primarySymptom: string;
    secondarySymptoms: string[];
    patient: {
      fullName: string;
      rut: string;
      birthDate: string;
      email: string;
      phone: string;
      address: string;
    };
    antecedents: Record<string, string>;
    suggestedTests: TestItem[];
    selectedTests: TestItem[];
    followUpQuestions: string[];
    followUpAnswers: Record<string, string>;
    validatedByEmail?: string;
    validatedAt?: number;
    signedPdfLinks?: Array<{
      category: "laboratory" | "image" | "procedure" | "interconsultation";
      url: string;
      fileName: string;
    }>;
  };
  examCatalog: Array<{
    name: string;
    category: "laboratory" | "image" | "procedure" | "interconsultation";
    fonasaCode: string;
  }>;
};

const EMPTY_EXAM_CATALOG: RequestDetailPayload["examCatalog"] = [];

function formatDateTime(value?: number) {
  if (!value) return "No informado";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ReviewSymptomsOrderClient({
  requestId,
  doctorEmail,
}: {
  requestId: string;
  doctorEmail: string;
}) {
  const router = useRouter();
  const [payload, setPayload] = useState<RequestDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitWarning, setSubmitWarning] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [catalogFilter, setCatalogFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/portal-medicos/symptoms/${requestId}`, {
          cache: "no-store",
        });
        const data = (await response.json().catch(() => null)) as
          | (RequestDetailPayload & { error?: string })
          | null;
        if (!response.ok || !data?.request) {
          throw new Error(data?.error || "No pudimos cargar la orden.");
        }
        if (cancelled) return;
        setPayload(data);
        const baseTests = data.request.selectedTests.length
          ? data.request.selectedTests
          : data.request.suggestedTests;
        setSelectedNames(new Set(baseTests.map((test) => test.name)));
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "No pudimos cargar la orden.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const request = payload?.request;
  const examCatalog = payload?.examCatalog ?? EMPTY_EXAM_CATALOG;
  const availableTests = useMemo(() => {
    if (!request) return [];
    return request.suggestedTests.length > 0 ? request.suggestedTests : request.selectedTests;
  }, [request]);
  const selectedTestsPreview = useMemo(() => {
    const byName = new Map<string, TestItem>(availableTests.map((test) => [test.name, test]));
    for (const exam of examCatalog) {
      if (!byName.has(exam.name)) {
        byName.set(exam.name, {
          name: exam.name,
          why: "Añadido por médico validador durante la revisión clínica.",
        });
      }
    }
    return Array.from(selectedNames)
      .map((name) => byName.get(name))
      .filter((item): item is TestItem => Boolean(item))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [availableTests, examCatalog, selectedNames]);
  const filteredCatalog = useMemo(() => {
    const cleanFilter = catalogFilter.trim().toLowerCase();
    if (!cleanFilter) return examCatalog;
    return examCatalog.filter((exam) => exam.name.toLowerCase().includes(cleanFilter));
  }, [catalogFilter, examCatalog]);

  async function handleValidate() {
    if (!request || isSubmitting) return;
    if (selectedNames.size === 0) {
      setSubmitError("Debes mantener al menos un examen antes de validar.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError("");
      setSubmitWarning("");
      const response = await fetch(`/api/portal-medicos/symptoms/${request.id}/validate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          selectedExamNames: Array.from(selectedNames),
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; warnings?: string[] }
        | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "No pudimos validar la orden.");
      }
      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        setSubmitWarning(data.warnings.join(" "));
        router.refresh();
        return;
      }
      router.push("/portal-medicos");
      router.refresh();
    } catch (validationError) {
      setSubmitError(
        validationError instanceof Error ? validationError.message : "No pudimos validar la orden.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8">
        <p className="text-sm text-slate-600">Cargando orden...</p>
      </section>
    );
  }

  if (error || !request) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8">
        <p className="text-sm text-rose-600">{error || "No encontramos la orden solicitada."}</p>
        <Link href="/portal-medicos" className="mt-4 inline-flex text-sm font-semibold underline">
          Volver al portal
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Revisión clínica
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            Orden por síntomas {request.id}
          </h1>
          <p className="mt-1 text-sm text-slate-600">Médico en sesión: {doctorEmail}</p>
        </div>
        <div
          className={`inline-flex h-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
            request.reviewStatus === "validated"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {request.reviewStatus === "validated" ? "Validada" : "Pendiente"}
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-2">
        <p>
          <span className="font-semibold text-slate-800">Paciente:</span> {request.patient.fullName}
        </p>
        <p>
          <span className="font-semibold text-slate-800">RUT:</span> {request.patient.rut}
        </p>
        <p>
          <span className="font-semibold text-slate-800">Síntoma principal:</span>{" "}
          {request.primarySymptom}
        </p>
        <p>
          <span className="font-semibold text-slate-800">Resumen:</span> {request.oneLinerSummary}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-900">Exámenes sugeridos por IA</p>
        <div className="mt-3 grid gap-2">
          {availableTests.map((test) => {
            const selected = selectedNames.has(test.name);
            return (
              <label
                key={test.name}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 text-sm ${
                  selected
                    ? "border-slate-300 bg-white text-slate-900"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setSelectedNames((current) => {
                      const next = new Set(current);
                      if (checked) {
                        next.add(test.name);
                      } else {
                        next.delete(test.name);
                      }
                      return next;
                    });
                  }}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                  disabled={request.reviewStatus === "validated"}
                />
                <div>
                  <p className="font-semibold">{test.name}</p>
                  <p className="text-xs">{test.why}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-900">
          Agregar exámenes desde catálogo completo
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Los exámenes añadidos aquí se incorporarán en la orden final enviada al paciente.
        </p>
        <input
          value={catalogFilter}
          onChange={(event) => setCatalogFilter(event.target.value)}
          placeholder="Buscar examen..."
          className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          disabled={request.reviewStatus === "validated"}
        />
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
          {filteredCatalog.map((exam) => {
            const selected = selectedNames.has(exam.name);
            return (
              <label
                key={`catalog-${exam.name}`}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 text-sm ${
                  selected
                    ? "border-slate-300 bg-white text-slate-900"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setSelectedNames((current) => {
                      const next = new Set(current);
                      if (checked) {
                        next.add(exam.name);
                      } else {
                        next.delete(exam.name);
                      }
                      return next;
                    });
                  }}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                  disabled={request.reviewStatus === "validated"}
                />
                <div>
                  <p className="font-semibold">{exam.name}</p>
                  <p className="text-xs text-slate-500">
                    {exam.category} · Código FONASA: {exam.fonasaCode}
                  </p>
                </div>
              </label>
            );
          })}
          {filteredCatalog.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              No encontramos exámenes con ese filtro.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-900">
          Orden final a validar ({selectedTestsPreview.length})
        </p>
        <div className="mt-3 grid gap-2">
          {selectedTestsPreview.map((test) => (
            <div
              key={`selected-preview-${test.name}`}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              <p className="font-semibold text-slate-900">{test.name}</p>
              <p className="text-xs text-slate-600">{test.why}</p>
            </div>
          ))}
        </div>
      </div>

      {request.reviewStatus === "validated" ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-semibold">Orden validada</p>
          <p className="mt-1">
            Validada por {request.validatedByEmail || "médico Veramed"} el{" "}
            {formatDateTime(request.validatedAt)}.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleValidate}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "Validando y firmando..." : "Validar y firmar orden"}
          </button>
          <Link
            href="/portal-medicos"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-900"
          >
            Volver
          </Link>
        </div>
      )}

      {submitError ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {submitError}
        </p>
      ) : null}
      {submitWarning ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {submitWarning}
        </p>
      ) : null}
    </section>
  );
}
