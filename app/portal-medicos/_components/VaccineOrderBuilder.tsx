"use client";

import { useMemo, useState } from "react";
import { Field, inputClassName, IntegrationNotice, PageHeader, PreviewModal } from "@/app/portal-medicos/_components/PortalUi";
import { VACCINE_CATALOG, type VaccineCatalogItem } from "@/lib/medical-portal/vaccine-catalog";

export default function VaccineOrderBuilder() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [doses, setDoses] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<string[]>(["pni-general"]);
  const [query, setQuery] = useState("");
  const [diagnoses, setDiagnoses] = useState("");
  const [observations, setObservations] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const allVaccines = useMemo(() => VACCINE_CATALOG.flatMap((group) => group.sections.flatMap((section) => section.vaccines)), []);
  const selectedVaccines = useMemo(() => selectedIds.map((id) => allVaccines.find((item) => item.id === id)).filter((item): item is VaccineCatalogItem => Boolean(item)), [allVaccines, selectedIds]);
  const cleanQuery = query.trim().toLocaleLowerCase("es");

  function toggle(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function toggleSection(sectionId: string) {
    setOpenSections((current) => current.includes(sectionId) ? current.filter((id) => id !== sectionId) : [...current, sectionId]);
  }

  function toggleGroup(groupId: string) {
    const group = VACCINE_CATALOG.find((entry) => entry.id === groupId);
    if (!group) return;
    const ids = group.sections.flatMap((section) => section.vaccines.map((item) => item.id));
    const allSelected = ids.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => allSelected ? current.filter((id) => !ids.includes(id)) : Array.from(new Set([...current, ...ids])));
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Indicaciones" title="Indicación de vacunas" description="Explora el catálogo por programa y grupo, selecciona vacunas y prepara una indicación clara para revisión." />
      <IntegrationNotice>El catálogo y la vista previa funcionan localmente. Veramed aún no cuenta con backend para emitir o firmar indicaciones de vacunas.</IntegrationNotice>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="space-y-5 rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-6">
          <Field label="Buscar vacuna"><input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClassName} placeholder="Nombre comercial o descripción" /></Field>
          {VACCINE_CATALOG.map((group) => {
            const groupIds = group.sections.flatMap((section) => section.vaccines.map((item) => item.id));
            const allGroupSelected = groupIds.every((id) => selectedIds.includes(id));
            return (
              <section key={group.id} className="overflow-hidden rounded-2xl border border-slate-200">
                <header className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-4">
                  <div><h2 className="font-semibold text-slate-950">{group.title}</h2><p className="mt-1 text-xs text-slate-500">{groupIds.filter((id) => selectedIds.includes(id)).length} de {groupIds.length} seleccionadas</p></div>
                  <button type="button" onClick={() => toggleGroup(group.id)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-800">{allGroupSelected ? "Deseleccionar todos" : "Seleccionar todos"}</button>
                </header>
                <div className="divide-y divide-slate-200">
                  {group.sections.map((section) => {
                    const visibleVaccines = cleanQuery ? section.vaccines.filter((item) => `${item.name} ${item.description}`.toLocaleLowerCase("es").includes(cleanQuery)) : section.vaccines;
                    if (cleanQuery && visibleVaccines.length === 0) return null;
                    const open = cleanQuery.length > 0 || openSections.includes(section.id);
                    return (
                      <div key={section.id}>
                        <button type="button" onClick={() => toggleSection(section.id)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"><span>{section.title}</span><span className={`text-slate-400 transition ${open ? "rotate-180" : ""}`}>⌄</span></button>
                        {open ? <div className="space-y-2 bg-slate-50/60 px-3 pb-3 sm:px-4">{visibleVaccines.map((item) => {
                          const selected = selectedIds.includes(item.id);
                          return <div key={item.id} className={`rounded-xl border p-3 transition ${selected ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={selected} onChange={() => toggle(item.id)} className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-700" /><span><span className="block text-sm font-semibold text-slate-900">{item.name}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span></span></label>{selected && item.allowsDose ? <label className="mt-3 flex items-center gap-2 pl-7 text-xs font-semibold text-slate-600"><span>Dosis</span><input value={doses[item.id] ?? ""} onChange={(event) => setDoses((current) => ({ ...current, [item.id]: event.target.value }))} className="w-28 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm" placeholder="Ej. 1ª" /></label> : null}</div>;
                        })}</div> : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          <div className="grid gap-5 md:grid-cols-2"><Field label="Diagnósticos"><textarea value={diagnoses} onChange={(event) => setDiagnoses(event.target.value)} className={`${inputClassName} min-h-28`} /></Field><Field label="Observaciones"><textarea value={observations} onChange={(event) => setObservations(event.target.value)} className={`${inputClassName} min-h-28`} /></Field></div>
        </section>

        <aside className="h-fit rounded-[1.5rem] border border-slate-200 bg-white p-5 2xl:sticky 2xl:top-5">
          <div className="flex items-center justify-between"><h2 className="font-semibold text-slate-950">Indicación actual</h2><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">{selectedVaccines.length}</span></div>
          {selectedVaccines.length ? <div className="mt-4 max-h-[52vh] space-y-2 overflow-y-auto pr-1">{selectedVaccines.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.description}{doses[item.id] ? ` · Dosis ${doses[item.id]}` : ""}</p></div><button type="button" onClick={() => toggle(item.id)} className="text-xs font-semibold text-rose-700 hover:underline">Quitar</button></div></article>)}</div> : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Selecciona vacunas desde los grupos.</p>}
          <div className="mt-5 grid gap-2"><button type="button" disabled={!selectedVaccines.length} onClick={() => setPreviewOpen(true)} className="rounded-xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-40">Vista previa</button><button type="button" disabled title="Backend de emisión pendiente" className="rounded-xl bg-slate-300 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed">Emitir indicación</button></div>
        </aside>
      </div>

      <PreviewModal open={previewOpen} title="Vista previa · Indicación de vacunas" onClose={() => setPreviewOpen(false)}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Veramed · Borrador no emitido</p>
        <div className="mt-5 space-y-3">{selectedVaccines.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-4"><p className="font-semibold text-slate-900">{item.name}</p><p className="mt-1 text-sm text-slate-600">{item.description}{doses[item.id] ? ` · Dosis: ${doses[item.id]}` : ""}</p></div>)}</div>
        <div className="mt-6 grid gap-4 border-t border-slate-200 pt-5 text-sm"><p><strong>Diagnósticos:</strong> {diagnoses || "No informados"}</p><p><strong>Observaciones:</strong> {observations || "Sin observaciones"}</p></div>
      </PreviewModal>
    </div>
  );
}
