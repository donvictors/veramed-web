"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, inputClassName } from "@/app/portal-medicos/_components/PortalUi";

type ReceiptStatus = "pending" | "ready" | "sent";
type ReceiptItem = {
  receiptId: string | null;
  requestType: "checkup" | "chronic_control" | "symptoms";
  requestId: string;
  serviceLabel: string;
  patientName: string;
  patientEmail: string;
  patientRut: string;
  paymentId: string;
  amount: number;
  currency: string;
  paidAt: string;
  eligibleAt: string;
  status: ReceiptStatus;
  folio: string | null;
  fileName: string | null;
  uploadedAt: string | null;
  emailSentAt: string | null;
  lastEmailError: string | null;
};

const statusCopy: Record<ReceiptStatus, { label: string; className: string }> = {
  pending: { label: "Pendiente de emisión", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  ready: { label: "Lista para enviar", className: "bg-sky-50 text-sky-800 ring-sky-200" },
  sent: { label: "Enviada", className: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
};

function dateLabel(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" })
    .format(new Date(value));
}

function moneyLabel(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 })
    .format(amount);
}

function itemKey(item: ReceiptItem) {
  return `${item.requestType}:${item.requestId}`;
}

export default function ReceiptManagementClient() {
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [filter, setFilter] = useState<"all" | ReceiptStatus>("pending");
  const [folios, setFolios] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const response = await fetch("/api/portal-medicos/receipts", { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as { items?: ReceiptItem[]; error?: string };
      if (!response.ok) throw new Error(body.error || "No pudimos cargar las boletas.");
      setItems(body.items ?? []);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos cargar las boletas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    all: items.length,
    pending: items.filter((item) => item.status === "pending").length,
    ready: items.filter((item) => item.status === "ready").length,
    sent: items.filter((item) => item.status === "sent").length,
  }), [items]);
  const visible = useMemo(
    () => filter === "all" ? items : items.filter((item) => item.status === filter),
    [filter, items],
  );

  async function upload(event: React.FormEvent<HTMLFormElement>, item: ReceiptItem) {
    event.preventDefault();
    const key = itemKey(item);
    const folio = (folios[key] ?? item.folio ?? "").trim();
    const file = files[key];
    if (!folio || !file) {
      setError("Ingresa el folio y selecciona el PDF descargado desde el SII.");
      return;
    }
    setBusy((current) => ({ ...current, [key]: true }));
    setError("");
    setNotice("");
    try {
      const form = new FormData();
      form.set("requestType", item.requestType);
      form.set("requestId", item.requestId);
      form.set("folio", folio);
      form.set("file", file);
      const response = await fetch("/api/portal-medicos/receipts", { method: "POST", body: form });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || "No pudimos guardar la boleta.");
      setNotice(`Boleta folio ${folio} guardada. Ya puedes enviarla al paciente.`);
      setFiles((current) => ({ ...current, [key]: undefined }));
      await load();
      setFilter("ready");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos guardar la boleta.");
    } finally {
      setBusy((current) => ({ ...current, [key]: false }));
    }
  }

  async function send(item: ReceiptItem) {
    if (!item.receiptId) return;
    const key = itemKey(item);
    setBusy((current) => ({ ...current, [key]: true }));
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/portal-medicos/receipts/${item.receiptId}/send`, { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || "No pudimos enviar la boleta.");
      setNotice(`Boleta folio ${item.folio} enviada a ${item.patientEmail}.`);
      await load();
      setFilter("sent");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos enviar la boleta.");
    } finally {
      setBusy((current) => ({ ...current, [key]: false }));
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Administración"
        title="Boletas electrónicas"
        description="Emite la boleta exenta en el SII, adjunta el PDF y envíalo al paciente desde Veramed. Solo aparecen pagos confirmados con su orden ya emitida."
        aside={<a href="https://www.sii.cl/servicios_online/3532-3810.html" target="_blank" rel="noopener noreferrer" className="inline-flex rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800">Abrir e-Boleta SII ↗</a>}
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}
      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</div> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Pendientes de emitir" value={counts.pending} tone="amber" />
        <Metric label="Listas para enviar" value={counts.ready} tone="sky" />
        <Metric label="Enviadas" value={counts.sent} tone="emerald" />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        {(["pending", "ready", "sent", "all"] as const).map((value) => (
          <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${filter === value ? "bg-emerald-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
            {value === "pending" ? "Pendientes" : value === "ready" ? "Listas" : value === "sent" ? "Enviadas" : "Todas"} ({counts[value]})
          </button>
        ))}
      </div>

      {loading ? <p className="py-10 text-sm text-slate-600">Cargando pagos…</p> : null}
      {!loading && visible.length === 0 ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white px-6 py-14 text-center">
          <h2 className="font-semibold text-slate-950">No hay boletas en esta sección</h2>
          <p className="mt-2 text-sm text-slate-500">Los pagos aparecerán cuando la orden correspondiente haya sido emitida.</p>
        </div>
      ) : null}

      <div className="space-y-4">
        {visible.map((item) => {
          const key = itemKey(item);
          const isBusy = Boolean(busy[key]);
          return (
            <article key={key} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,.75fr)] lg:p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusCopy[item.status].className}`}>{statusCopy[item.status].label}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{item.serviceLabel}</span>
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-slate-950">{item.patientName || "Paciente sin nombre"}</h2>
                  <p className="mt-1 text-sm text-slate-600">{item.patientEmail}{item.patientRut ? ` · ${item.patientRut}` : ""}</p>
                  <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                    <Info label="Monto pagado" value={moneyLabel(item.amount, item.currency)} />
                    <Info label="Pago confirmado" value={dateLabel(item.paidAt)} />
                    <Info label="ID de pago" value={item.paymentId} compact />
                  </dl>
                  {item.status !== "pending" ? (
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                      <span><strong className="text-slate-900">Folio:</strong> {item.folio}</span>
                      <span><strong className="text-slate-900">PDF:</strong> {item.fileName}</span>
                      {item.emailSentAt ? <span><strong className="text-slate-900">Enviada:</strong> {dateLabel(item.emailSentAt)}</span> : null}
                    </div>
                  ) : null}
                  {item.lastEmailError ? <p className="mt-3 text-sm text-rose-700">Último error de envío: {item.lastEmailError}</p> : null}
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  {item.status === "sent" ? (
                    <div className="flex h-full flex-col justify-center">
                      <p className="font-semibold text-emerald-900">Correo enviado correctamente</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">La boleta quedó registrada y fue enviada a {item.patientEmail}.</p>
                      {item.receiptId ? <a href={`/api/portal-medicos/receipts/${item.receiptId}/pdf`} target="_blank" rel="noopener noreferrer" className="mt-4 text-sm font-semibold text-emerald-800 hover:underline">Abrir PDF ↗</a> : null}
                    </div>
                  ) : (
                    <>
                      <form onSubmit={(event) => upload(event, item)} className="space-y-3">
                        <label className="block text-sm font-semibold text-slate-800">Folio del SII
                          <input value={folios[key] ?? item.folio ?? ""} onChange={(event) => setFolios((current) => ({ ...current, [key]: event.target.value }))} className={`${inputClassName} mt-2`} placeholder="Ej: 123" required />
                        </label>
                        <label className="block text-sm font-semibold text-slate-800">PDF de la boleta
                          <input type="file" accept="application/pdf,.pdf" onChange={(event) => setFiles((current) => ({ ...current, [key]: event.target.files?.[0] }))} className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold file:text-emerald-800 file:ring-1 file:ring-slate-200" required />
                        </label>
                        <button type="submit" disabled={isBusy} className="w-full rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-50">{isBusy ? "Guardando…" : item.status === "ready" ? "Reemplazar PDF" : "Guardar boleta"}</button>
                      </form>
                      {item.status === "ready" && item.receiptId ? (
                        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200 pt-4">
                          <a href={`/api/portal-medicos/receipts/${item.receiptId}/pdf`} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white px-3 py-2.5 text-center text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">Revisar PDF</a>
                          <button type="button" onClick={() => void send(item)} disabled={isBusy} className="rounded-xl bg-emerald-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{isBusy ? "Enviando…" : "Enviar al paciente"}</button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "amber" | "sky" | "emerald" }) {
  const styles = tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-950" : tone === "sky" ? "border-sky-200 bg-sky-50 text-sky-950" : "border-emerald-200 bg-emerald-50 text-emerald-950";
  return <div className={`rounded-2xl border p-4 ${styles}`}><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] opacity-75">{label}</p></div>;
}

function Info({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</dt><dd className={`mt-1 font-medium text-slate-800 ${compact ? "break-all text-xs" : ""}`}>{value}</dd></div>;
}
