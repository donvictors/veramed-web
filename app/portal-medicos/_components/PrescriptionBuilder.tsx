"use client";

import { useState } from "react";
import { Field, inputClassName, IntegrationNotice, PageHeader, PreviewModal } from "@/app/portal-medicos/_components/PortalUi";

type Mode = "standard" | "compound";
type CompoundComponent = { id: string; name: string; amount: string; unit: string };
type PrescriptionItem = {
  id: string;
  name: string;
  commercial: string;
  composition: string;
  amount: string;
  amountUnit: string;
  dose: string;
  doseUnit: string;
  frequency: string;
  frequencyUnit: string;
  duration: string;
  durationUnit: string;
  csp: string;
  startDate: string;
  observations: string;
  components: CompoundComponent[];
};

const emptyItem: Omit<PrescriptionItem, "id"> = {
  name: "",
  commercial: "",
  composition: "",
  amount: "",
  amountUnit: "g",
  dose: "",
  doseUnit: "comprimido(s)",
  frequency: "",
  frequencyUnit: "horas",
  duration: "",
  durationUnit: "días",
  csp: "",
  startDate: new Date().toISOString().slice(0, 10),
  observations: "",
  components: [],
};

export default function PrescriptionBuilder({ mode }: { mode: Mode }) {
  const compound = mode === "compound";
  const [draft, setDraft] = useState(emptyItem);
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [editingId, setEditingId] = useState("");
  const [componentDraft, setComponentDraft] = useState({ name: "", amount: "", unit: "g" });
  const [editingComponentId, setEditingComponentId] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function saveItem() {
    if (!draft.name.trim()) {
      setError(compound ? "Ingresa el nombre del compuesto o preparación." : "Ingresa un medicamento o principio activo.");
      return;
    }
    if (compound && draft.components.length === 0) {
      setError("Agrega al menos un componente a la preparación.");
      return;
    }
    if (!draft.dose.trim() || !draft.frequency.trim()) {
      setError("Completa dosis y frecuencia antes de agregar la indicación.");
      return;
    }
    const item = { ...draft, id: editingId || crypto.randomUUID() };
    setItems((current) => editingId ? current.map((entry) => entry.id === editingId ? item : entry) : [...current, item]);
    setDraft({ ...emptyItem, startDate: new Date().toISOString().slice(0, 10) });
    setEditingId("");
    setComponentDraft({ name: "", amount: "", unit: "g" });
    setEditingComponentId("");
    setError("");
  }

  function saveComponent() {
    if (!componentDraft.name.trim() || !componentDraft.amount.trim()) {
      setError("Completa nombre y cantidad del componente.");
      return;
    }
    const component = { ...componentDraft, id: editingComponentId || crypto.randomUUID() };
    update("components", editingComponentId ? draft.components.map((item) => item.id === editingComponentId ? component : item) : [...draft.components, component]);
    setComponentDraft({ name: "", amount: "", unit: "g" });
    setEditingComponentId("");
    setError("");
  }

  function edit(item: PrescriptionItem) {
    const { id, ...nextDraft } = item;
    setDraft(nextDraft);
    setEditingId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Medicamentos"
        title={compound ? "Emitir receta magistral" : "Emitir receta"}
        description={compound ? "Construye una preparación magistral por componentes y revisa la indicación antes de emitir." : "Busca el medicamento, configura su indicación y construye una receta con uno o más fármacos."}
      />
      <IntegrationNotice>
        No existe todavía una fuente farmacológica ni un backend de emisión en Veramed. Puedes construir y revisar el borrador, pero la emisión permanece bloqueada.
      </IntegrationNotice>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-950">{editingId ? "Editar indicación" : compound ? "Nueva preparación" : "Nueva indicación"}</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label={compound ? "Nombre del compuesto o preparación" : "Medicamento o principio activo"} hint={compound ? undefined : "La búsqueda estructurada se conectará cuando exista una fuente farmacológica."}>
              <input value={draft.name} onChange={(event) => update("name", event.target.value)} className={inputClassName} placeholder={compound ? "Ej. Fórmula dermatológica" : "Ej. Losartán 100 mg"} />
            </Field>
            {compound ? (
              <Field label="Cantidad y unidad">
                <div className="grid grid-cols-[1fr_120px] gap-2">
                  <input value={draft.amount} onChange={(event) => update("amount", event.target.value)} className={inputClassName} inputMode="decimal" />
                  <select value={draft.amountUnit} onChange={(event) => update("amountUnit", event.target.value)} className={inputClassName}><option>g</option><option>mg</option><option>ml</option><option>unidad(es)</option></select>
                </div>
              </Field>
            ) : (
              <Field label="Recomendación comercial" hint="Opcional; se mantiene separada del principio activo.">
                <input value={draft.commercial} onChange={(event) => update("commercial", event.target.value)} className={inputClassName} placeholder="Opcional" />
              </Field>
            )}
            {compound ? (
              <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-900">Componentes de la preparación</h3><span className="text-xs font-semibold text-slate-500">{draft.components.length} agregado(s)</span></div>
                <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_110px_auto]">
                  <input value={componentDraft.name} onChange={(event) => setComponentDraft((current) => ({ ...current, name: event.target.value }))} className={inputClassName} placeholder="Componente" aria-label="Nombre del componente" />
                  <input value={componentDraft.amount} onChange={(event) => setComponentDraft((current) => ({ ...current, amount: event.target.value }))} className={inputClassName} placeholder="Cantidad" aria-label="Cantidad del componente" />
                  <select value={componentDraft.unit} onChange={(event) => setComponentDraft((current) => ({ ...current, unit: event.target.value }))} className={inputClassName} aria-label="Unidad del componente"><option>g</option><option>mg</option><option>ml</option><option>%</option><option>UI</option></select>
                  <button type="button" onClick={saveComponent} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700">{editingComponentId ? "Guardar" : "Agregar"}</button>
                </div>
                {draft.components.length ? <div className="mt-3 space-y-2">{draft.components.map((component) => <div key={component.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"><p className="text-sm"><span className="font-semibold text-slate-900">{component.name}</span> <span className="text-slate-500">· {component.amount} {component.unit}</span></p><div className="flex gap-3 text-xs font-semibold"><button type="button" onClick={() => { setComponentDraft({ name: component.name, amount: component.amount, unit: component.unit }); setEditingComponentId(component.id); }} className="text-emerald-800 hover:underline">Editar</button><button type="button" onClick={() => update("components", draft.components.filter((item) => item.id !== component.id))} className="text-rose-700 hover:underline">Eliminar</button></div></div>)}</div> : null}
                <div className="mt-4"><Field label="Composición / forma farmacéutica"><textarea value={draft.composition} onChange={(event) => update("composition", event.target.value)} className={`${inputClassName} min-h-24`} placeholder="Base, vehículo o instrucciones de preparación" /></Field></div>
              </div>
            ) : null}
            <Field label="Dosis / posología">
              <div className="grid grid-cols-[1fr_150px] gap-2">
                <input value={draft.dose} onChange={(event) => update("dose", event.target.value)} className={inputClassName} inputMode="decimal" placeholder="1" />
                <select value={draft.doseUnit} onChange={(event) => update("doseUnit", event.target.value)} className={inputClassName}><option>comprimido(s)</option><option>cápsula(s)</option><option>ml</option><option>gota(s)</option><option>aplicación(es)</option><option>unidad(es)</option></select>
              </div>
            </Field>
            <Field label="Frecuencia">
              <div className="grid grid-cols-[1fr_150px] gap-2">
                <input value={draft.frequency} onChange={(event) => update("frequency", event.target.value)} className={inputClassName} inputMode="numeric" placeholder="12" />
                <select value={draft.frequencyUnit} onChange={(event) => update("frequencyUnit", event.target.value)} className={inputClassName}><option>horas</option><option>veces al día</option><option>días</option><option>semanas</option></select>
              </div>
            </Field>
            <Field label="Duración">
              <div className="grid grid-cols-[1fr_150px] gap-2">
                <input value={draft.duration} onChange={(event) => update("duration", event.target.value)} className={inputClassName} inputMode="numeric" disabled={["Permanente", "SOS"].includes(draft.durationUnit)} />
                <select value={draft.durationUnit} onChange={(event) => update("durationUnit", event.target.value)} className={inputClassName}><option>días</option><option>semanas</option><option>meses</option><option>Permanente</option><option>SOS</option></select>
              </div>
            </Field>
            {compound ? <Field label="C.S.P."><input value={draft.csp} onChange={(event) => update("csp", event.target.value)} className={inputClassName} placeholder="Cantidad suficiente para" /></Field> : null}
            <Field label="Fecha de inicio"><input type="date" value={draft.startDate} onChange={(event) => update("startDate", event.target.value)} className={inputClassName} /></Field>
            <div className="md:col-span-2"><Field label="Observaciones"><textarea value={draft.observations} onChange={(event) => update("observations", event.target.value)} className={`${inputClassName} min-h-24`} /></Field></div>
          </div>
          {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={saveItem} className="rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800">{editingId ? "Guardar cambios" : compound ? "Agregar preparación" : "Agregar a la receta"}</button>
            {editingId ? <button type="button" onClick={() => { setEditingId(""); setDraft(emptyItem); setComponentDraft({ name: "", amount: "", unit: "g" }); setEditingComponentId(""); }} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button> : null}
          </div>
        </section>

        <aside className="h-fit rounded-[1.5rem] border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-950">{compound ? "Preparaciones" : "Receta actual"}</h2><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">{items.length}</span></div>
          {items.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">Aún no has agregado indicaciones.</p> : (
            <div className="mt-4 space-y-3">{items.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 p-4"><p className="font-semibold text-slate-900">{item.name}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.dose} {item.doseUnit} cada {item.frequency} {item.frequencyUnit} · {item.durationUnit === "Permanente" || item.durationUnit === "SOS" ? item.durationUnit : `${item.duration} ${item.durationUnit}`}</p><div className="mt-3 flex gap-3 text-xs font-semibold"><button type="button" onClick={() => edit(item)} className="text-emerald-800 hover:underline">Editar</button><button type="button" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} className="text-rose-700 hover:underline">Eliminar</button></div></article>)}</div>
          )}
          <div className="mt-5 grid gap-2"><button type="button" onClick={() => setPreviewOpen(true)} disabled={items.length === 0} className="rounded-xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40">Vista previa</button><button type="button" disabled title="Backend de emisión pendiente" className="rounded-xl bg-slate-300 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed">Emitir receta</button>{items.length > 0 ? <button type="button" onClick={() => setItems([])} className="py-2 text-xs font-semibold text-rose-700 hover:underline">Eliminar todos</button> : null}</div>
        </aside>
      </div>

      <PreviewModal open={previewOpen} title={compound ? "Vista previa · Receta magistral" : "Vista previa · Receta médica"} onClose={() => setPreviewOpen(false)}>
        <div className="border-b border-slate-200 pb-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Veramed</p><h3 className="mt-2 text-2xl font-semibold text-slate-950">{compound ? "Receta magistral" : "Receta médica"}</h3><p className="mt-1 text-sm text-slate-500">Borrador no emitido</p></div>
        <ol className="mt-6 space-y-5">{items.map((item, index) => <li key={item.id} className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-bold text-emerald-700">{String(index + 1).padStart(2, "0")}</p><p className="mt-1 text-lg font-semibold">{item.name}</p>{item.components.length ? <ul className="mt-3 space-y-1 text-sm text-slate-700">{item.components.map((component) => <li key={component.id}>• {component.name}: {component.amount} {component.unit}</li>)}</ul> : null}{item.composition ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.composition}</p> : null}<p className="mt-3 text-sm leading-6 text-slate-700">Usar {item.dose} {item.doseUnit} cada {item.frequency} {item.frequencyUnit}, por {item.durationUnit === "Permanente" || item.durationUnit === "SOS" ? item.durationUnit : `${item.duration} ${item.durationUnit}`}. Inicio: {item.startDate || "no indicado"}.</p>{item.observations ? <p className="mt-2 text-sm text-slate-600">Observaciones: {item.observations}</p> : null}</li>)}</ol>
      </PreviewModal>
    </div>
  );
}
