"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, inputClassName } from "@/app/portal-medicos/_components/PortalUi";

type Campaign = { id: string; code: string | null; label: string; type: "percent_off" | "fixed_final_amount"; percentOff: number | null; finalAmountClp: number | null; active: boolean; startsAt: string | null; expiresAt: string | null; createdAt: string; paidUses: number };

function isUsable(item: Campaign) {
  const now = Date.now();
  return item.active && (!item.startsAt || new Date(item.startsAt).getTime() <= now) && (!item.expiresAt || new Date(item.expiresAt).getTime() > now);
}

export default function DiscountCampaignClient() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<Campaign["type"]>("fixed_final_amount");
  const [value, setValue] = useState("100");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [filter, setFilter] = useState<"active" | "all">("active");

  const load = useCallback(async () => {
    const response = await fetch("/api/portal-medicos/discounts", { cache: "no-store" });
    const body = await response.json() as { items?: Campaign[]; error?: string };
    if (!response.ok) throw new Error(body.error || "No pudimos cargar las campañas.");
    setItems(body.items ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { void load().catch((cause) => { setError(cause instanceof Error ? cause.message : "Error al cargar campañas."); setLoading(false); }); }, [load]);

  const visible = useMemo(() => items.filter((item) => filter === "all" || isUsable(item)), [items, filter]);
  const activeCount = items.filter(isUsable).length;
  const paidUses = items.reduce((total, item) => total + item.paidUses, 0);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setCreatedCode("");
    try {
      const response = await fetch("/api/portal-medicos/discounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        code, label, type, ...(type === "percent_off" ? { percentOff: Number(value) } : { finalAmountClp: Number(value) }),
        ...(startsAt ? { startsAt: new Date(startsAt).toISOString() } : {}),
        ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
      }) });
      const body = await response.json() as { code?: string; error?: string };
      if (!response.ok) throw new Error(body.error || "No pudimos crear el código.");
      setCreatedCode(body.code ?? ""); setCode(""); setLabel(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos crear el código."); }
    finally { setBusy(false); }
  }

  async function toggle(item: Campaign) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/portal-medicos/discounts/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !item.active }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "No pudimos cambiar el estado.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos cambiar el estado."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-7">
    <PageHeader eyebrow="Administración" title="Campañas y descuentos" description="Crea códigos privados, controla su vigencia y mide cuántos pagos confirmados usaron cada campaña." />
    {error ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p> : null}
    <div className="grid gap-3 sm:grid-cols-3">
      <Metric label="Códigos activos" value={activeCount} /><Metric label="Usos pagados registrados" value={paidUses} /><Metric label="Campañas" value={items.length} />
    </div>
    <form onSubmit={(event) => void create(event)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-950">Nuevo código</h2>
      <p className="mt-1 text-sm text-slate-600">El código queda cifrado en la base privada y su validación usa un hash. Sólo administradores del portal pueden verlo.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Código"><input className={inputClassName} value={code} onChange={(event) => setCode(event.target.value)} placeholder="CAMPAÑA-2026" required minLength={4} maxLength={80} /></Field>
        <Field label="Nombre de campaña"><input className={inputClassName} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Prueba de septiembre" required maxLength={100} /></Field>
        <Field label="Tipo"><select className={inputClassName} value={type} onChange={(event) => { setType(event.target.value as Campaign["type"]); setValue(event.target.value === "percent_off" ? "20" : "100"); }}><option value="fixed_final_amount">Precio final</option><option value="percent_off">Porcentaje de descuento</option></select></Field>
        <Field label={type === "percent_off" ? "Descuento (%)" : "Precio final (CLP)"}><input className={inputClassName} type="number" min={type === "percent_off" ? 1 : 0} max={type === "percent_off" ? 100 : 1000000} step="1" value={value} onChange={(event) => setValue(event.target.value)} required /></Field>
        <Field label="Inicio (opcional)"><input className={inputClassName} type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></Field>
        <Field label="Caducidad (opcional)"><input className={inputClassName} type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></Field>
      </div>
      <button disabled={busy} className="mt-5 rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{busy ? "Guardando…" : "Crear código"}</button>
      {createdCode ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><strong>Código creado:</strong> <code className="break-all font-semibold">{createdCode}</code></div> : null}
    </form>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Monitor de campañas</h2><div className="flex gap-2"><button onClick={() => setFilter("active")} className={`rounded-lg px-3 py-2 text-sm ${filter === "active" ? "bg-emerald-800 text-white" : "bg-slate-100"}`}>Activos</button><button onClick={() => setFilter("all")} className={`rounded-lg px-3 py-2 text-sm ${filter === "all" ? "bg-emerald-800 text-white" : "bg-slate-100"}`}>Todos</button></div></div>
      <p className="mt-2 text-xs text-slate-500">Los usos anteriores a este monitor no pueden atribuirse retrospectivamente: el sistema no guardaba la campaña en el pago. Los códigos anteriores a esta actualización sólo tienen hash y pueden aparecer sin texto.</p>
      {loading ? <p className="mt-5 text-sm">Cargando…</p> : visible.length === 0 ? <p className="mt-5 text-sm text-slate-500">No hay campañas en esta vista.</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-3">Campaña / código</th><th>Beneficio</th><th>Vigencia</th><th>Usos pagados</th><th>Estado</th><th className="text-right">Acción</th></tr></thead><tbody>{visible.map((item) => { const expired = item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now(); const future = item.startsAt && new Date(item.startsAt).getTime() > Date.now(); return <tr key={item.id} className="border-b border-slate-100"><td className="py-4 font-semibold">{item.label}<code className="mt-1 block break-all text-xs font-normal text-slate-500">{item.code ?? "Código legacy no recuperable"}</code></td><td>{item.type === "percent_off" ? `${item.percentOff}%` : `$${(item.finalAmountClp ?? 0).toLocaleString("es-CL")}`}</td><td>{expired ? "Caducado" : future ? "Programado" : item.expiresAt ? new Date(item.expiresAt).toLocaleDateString("es-CL") : "Sin caducidad"}</td><td className="font-semibold">{item.paidUses}</td><td>{item.active ? "Activo" : "Desactivado"}</td><td className="text-right"><button disabled={busy} onClick={() => void toggle(item)} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold hover:bg-slate-50 disabled:opacity-50">{item.active ? "Desactivar" : "Activar"}</button></td></tr>; })}</tbody></table></div>}
    </section>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold text-slate-700">{label}<span className="mt-2 block">{children}</span></label>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-2xl font-semibold text-emerald-950">{value}</p><p className="mt-1 text-xs font-semibold uppercase tracking-wider text-emerald-800">{label}</p></div>; }
