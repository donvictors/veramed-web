"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DashboardTab = "pending" | "validated";

type PendingItem = {
  id: string;
  patientName: string;
  primarySymptom: string;
  oneLinerSummary: string;
  reviewStatus: "pending_validation";
  createdAt: number;
};

type ValidatedItem = {
  id: string;
  patientName: string;
  primarySymptom: string;
  oneLinerSummary: string;
  reviewStatus: "validated";
  validatedAt?: number;
  createdAt: number;
};

type DashboardPayload = {
  month: number;
  year: number;
  doctorEmail: string;
  validatedCount: number;
  pending: PendingItem[];
  validated: ValidatedItem[];
};

function formatDateTime(timestamp?: number) {
  if (!timestamp) return "No informado";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function currentMonthYear() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export default function PortalMedicosClient({ doctorEmail }: { doctorEmail: string }) {
  const current = useMemo(() => currentMonthYear(), []);
  const [month, setMonth] = useState(current.month);
  const [year, setYear] = useState(current.year);
  const [tab, setTab] = useState<DashboardTab>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<DashboardPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(
          `/api/portal-medicos/symptoms?month=${month}&year=${year}`,
          { cache: "no-store" },
        );
        const data = (await response.json().catch(() => null)) as
          | (DashboardPayload & { error?: string })
          | null;
        if (!response.ok || !data) {
          throw new Error(data?.error || "No pudimos cargar la consola médica.");
        }
        if (cancelled) return;
        setPayload(data);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No pudimos cargar la consola médica.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [month, year]);

  const rows = tab === "pending" ? payload?.pending ?? [] : payload?.validated ?? [];

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
        Portal médicos
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
        Consola de validación clínica
      </h1>
      <p className="mt-2 text-sm text-slate-600">Sesión activa: {doctorEmail}</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Órdenes validadas del mes
            </p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">
              {payload?.validatedCount ?? 0}
            </p>
          </div>
          <div className="flex gap-2">
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Mes
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {Array.from({ length: 12 }, (_, idx) => idx + 1).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Año
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {Array.from({ length: 6 }, (_, idx) => current.year - 2 + idx).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button
          onClick={() => setTab("pending")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === "pending" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-white"
          }`}
        >
          Órdenes pendientes ({payload?.pending.length ?? 0})
        </button>
        <button
          onClick={() => setTab("validated")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === "validated" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-white"
          }`}
        >
          Órdenes validadas ({payload?.validated.length ?? 0})
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-600">Cargando solicitudes...</p>
      ) : error ? (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No hay órdenes en esta vista para el periodo seleccionado.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          <div className="grid grid-cols-[1.1fr_1.1fr_1.2fr_0.9fr_0.7fr] gap-3 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
            <p>Código</p>
            <p>Paciente</p>
            <p>Síntoma principal</p>
            <p>Estado</p>
            <p>Acción</p>
          </div>

          <div className="divide-y divide-slate-200">
            {rows.map((row) => {
              const isPending = tab === "pending";
              return (
                <div
                  key={row.id}
                  className="grid grid-cols-[1.1fr_1.1fr_1.2fr_0.9fr_0.7fr] gap-3 px-4 py-4 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{row.id}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(
                        isPending
                          ? row.createdAt
                          : "validatedAt" in row
                            ? row.validatedAt
                            : row.createdAt,
                      )}
                    </p>
                  </div>
                  <p className="text-slate-800">{row.patientName}</p>
                  <p className="text-slate-700">{row.primarySymptom}</p>
                  <div
                    className={`inline-flex h-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      isPending
                        ? "border border-amber-200 bg-amber-50 text-amber-900"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    }`}
                  >
                    {isPending ? "Pendiente" : "Validada"}
                  </div>
                  <Link
                    href={`/portal-medicos/orden/${row.id}`}
                    className="text-sm font-semibold text-slate-900 underline"
                  >
                    Abrir
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
