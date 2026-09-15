"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, inputClassName } from "@/app/portal-medicos/_components/PortalUi";

type Item = {
  type: "checkup" | "chronic_control"; requestId: string; orderId: string | null;
  approvedAt: string | null; protocolVersion: string | null; emailSentAt: string | null;
  patientName: string; patientEmail: string; patientRut: string;
  amount: number | null; paidAt: string | null; tests: string[];
};
type Result = { items: Item[]; counts: { total: number; checkup: number; chronicControl: number; last24Hours: number; emailPending: number } };

function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "Sin fecha";
}

export default function AutomaticOrdersClient() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [type, setType] = useState<"all" | Item["type"]>("all");
  const [mail, setMail] = useState<"all" | "pending">("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/portal-medicos/automatic-orders", { cache: "no-store" });
      const body = await response.json() as Result & { error?: string };
      if (!response.ok) throw new Error(body.error || "No pudimos cargar las órdenes.");
      setResult(body);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos cargar las órdenes."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => (result?.items ?? []).filter((item) =>
    (type === "all" || item.type === type) && (mail === "all" || !item.emailSentAt) &&
    (!query.trim() || `${item.orderId} ${item.requestId} ${item.patientName} ${item.patientRut} ${item.patientEmail}`.toLocaleLowerCase("es-CL").includes(query.trim().toLocaleLowerCase("es-CL"))),
  ), [result, type, mail, query]);

  return <div className="space-y-7">
    <PageHeader eyebrow="Administración clínica" title="Órdenes automáticas" description="Monitor separado de las órdenes de chequeo y control crónico aprobadas por protocolo, con pago confirmado. La validación médica manual sigue en su panel actual." aside={<button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60">Actualizar</button>} />
    {error ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p> : null}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Metric label="Total emitidas" value={result?.counts.total ?? 0} />
      <Metric label="Chequeo" value={result?.counts.checkup ?? 0} />
      <Metric label="Control crónico" value={result?.counts.chronicControl ?? 0} />
      <Metric label="Últimas 24 horas" value={result?.counts.last24Hours ?? 0} />
      <Metric label="Correo pendiente" value={result?.counts.emailPending ?? 0} accent />
    </div>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Buscar en órdenes recientes</span><input className={inputClassName} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ID, paciente, RUT o correo" /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Origen</span><select className={inputClassName} value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="all">Ambos</option><option value="checkup">Chequeo</option><option value="chronic_control">Control crónico</option></select></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Correo</span><select className={inputClassName} value={mail} onChange={(event) => setMail(event.target.value as typeof mail)}><option value="all">Todos</option><option value="pending">Pendientes</option></select></label>
      </div>
      <p className="mt-3 text-xs text-slate-500">Se muestran las 100 órdenes más recientes. Los indicadores contabilizan todo el historial.</p>
    </section>
    <section className="space-y-3" aria-label="Órdenes automáticas recientes">
      {loading ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Cargando órdenes...</p> : visible.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No hay órdenes que coincidan con los filtros.</p> : visible.map((item) => {
        const open = expanded === item.requestId;
        return <article key={`${item.type}:${item.requestId}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">{item.type === "checkup" ? "Chequeo" : "Control crónico"}</span><span className="text-xs font-semibold text-slate-500">{item.orderId || item.requestId}</span></div><h2 className="mt-2 text-base font-semibold text-slate-950">{item.patientName || "Paciente sin nombre"}</h2><p className="mt-1 break-all text-xs text-slate-500">{item.patientRut || "Sin RUT"} · {item.patientEmail || "Sin correo"}</p></div>
            <div className="text-right text-xs text-slate-600"><p>Aprobada: {dateLabel(item.approvedAt)}</p><p className="mt-1">{item.emailSentAt ? <span className="font-semibold text-emerald-700">Correo enviado · {dateLabel(item.emailSentAt)}</span> : <span className="font-semibold text-amber-700">Correo pendiente</span>}</p></div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500"><span>{item.tests.length} {item.tests.length === 1 ? "examen" : "exámenes"} · Protocolo {item.protocolVersion || "sin versión"} · Pago {item.paidAt ? dateLabel(item.paidAt) : "confirmado"}</span><button type="button" onClick={() => setExpanded(open ? null : item.requestId)} aria-expanded={open} className="font-semibold text-emerald-800 hover:underline">{open ? "Ocultar exámenes" : "Ver exámenes"}</button></div>
          {open ? <div className="mt-3 rounded-xl bg-slate-50 p-4"><ul className="grid gap-1 text-sm text-slate-700 sm:grid-cols-2">{item.tests.map((name, index) => <li key={`${name}-${index}`}>· {name}</li>)}</ul>{item.tests.length === 0 ? <p className="text-sm text-slate-500">Sin desglose disponible.</p> : null}</div> : null}
        </article>;
      })}
    </section>
  </div>;
}

function Metric({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return <div className={`rounded-2xl border p-4 shadow-sm ${accent ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}><p className="text-xs font-semibold text-slate-600">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p></div>;
}
