"use client";

import { useMemo, useState } from "react";
import { Field, inputClassName, IntegrationNotice, PageHeader, PreviewModal } from "@/app/portal-medicos/_components/PortalUi";

type Category = "laboratory" | "image" | "procedure";
type Exam = { name: string; category: Category; fonasaCode: string; aliases: string[]; orderObservation: string };

const categoryConfig: Record<Category, { label: string; placeholder: string }> = {
  laboratory: { label: "Laboratorios", placeholder: "Buscar examen de laboratorio" },
  image: { label: "Imágenes", placeholder: "Buscar examen de imagen" },
  procedure: { label: "Procedimientos", placeholder: "Buscar procedimiento" },
};

export default function ExamOrderBuilder({ catalog }: { catalog: Exam[] }) {
  const [category, setCategory] = useState<Category>("laboratory");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Exam[]>([]);
  const [diagnoses, setDiagnoses] = useState("");
  const [observations, setObservations] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const matches = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase("es");
    if (clean.length < 2) return [];
    return catalog.filter((exam) => exam.category === category && [exam.name, ...exam.aliases].some((value) => value.toLocaleLowerCase("es").includes(clean))).slice(0, 12);
  }, [catalog, category, query]);

  function addExam(exam: Exam) {
    setSelected((current) => current.some((item) => item.name === exam.name) ? current : [...current, exam]);
    setQuery("");
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Indicaciones" title="Indicaciones médicas" description="Selecciona exámenes desde el catálogo clínico existente y reúne varias prestaciones en una misma orden." />
      <IntegrationNotice>La selección usa el catálogo real de Veramed. La emisión de órdenes iniciadas directamente por el médico aún no tiene un backend propio, por lo que solo se habilita la vista previa.</IntegrationNotice>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-950">Selección de exámenes médicos</h2>
          <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Categoría de indicación">
            {(Object.keys(categoryConfig) as Category[]).map((value) => <button key={value} type="button" role="tab" aria-selected={category === value} onClick={() => { setCategory(value); setQuery(""); }} className={`rounded-lg px-2 py-2.5 text-xs font-semibold transition sm:text-sm ${category === value ? "bg-white text-emerald-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>{categoryConfig[value].label}</button>)}
          </div>

          <div className="relative mt-5">
            <Field label={categoryConfig[category].placeholder}>
              <input value={query} onChange={(event) => setQuery(event.target.value)} className={inputClassName} placeholder="Escribe al menos 2 caracteres" autoComplete="off" />
            </Field>
            {query.trim().length >= 2 ? (
              <div className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                {matches.length ? matches.map((exam) => <button key={exam.name} type="button" onClick={() => addExam(exam)} className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-3 text-left hover:bg-emerald-50"><span><span className="block text-sm font-semibold text-slate-900">{exam.name}</span><span className="mt-1 block text-xs text-slate-500">Código FONASA: {exam.fonasaCode}</span></span><span className="text-xs font-semibold text-emerald-700">Agregar</span></button>) : <p className="px-3 py-4 text-sm text-slate-500">No encontramos coincidencias en esta categoría.</p>}
              </div>
            ) : null}
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <Field label="Diagnósticos"><textarea value={diagnoses} onChange={(event) => setDiagnoses(event.target.value)} className={`${inputClassName} min-h-28`} placeholder="Diagnóstico(s) o hipótesis clínica" /></Field>
            <Field label="Observaciones"><textarea value={observations} onChange={(event) => setObservations(event.target.value)} className={`${inputClassName} min-h-28`} placeholder="Indicaciones complementarias" /></Field>
          </div>
        </section>

        <aside className="h-fit rounded-[1.5rem] border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between"><h2 className="font-semibold text-slate-950">Orden actual</h2><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">{selected.length}</span></div>
          {selected.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">Busca y agrega una o más prestaciones.</p> : <div className="mt-4 space-y-2">{selected.map((exam) => <article key={exam.name} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><p className="text-sm font-semibold text-slate-900">{exam.name}</p><p className="mt-1 text-xs text-slate-500">{categoryConfig[exam.category].label} · {exam.fonasaCode}</p></div><button type="button" onClick={() => setSelected((current) => current.filter((item) => item.name !== exam.name))} className="text-xs font-semibold text-rose-700 hover:underline">Eliminar</button></article>)}</div>}
          <div className="mt-5 grid gap-2"><button type="button" disabled={!selected.length} onClick={() => setPreviewOpen(true)} className="rounded-xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40">Vista previa</button><button type="button" disabled title="Backend de emisión pendiente" className="rounded-xl bg-slate-300 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed">Emitir orden</button></div>
        </aside>
      </div>

      <PreviewModal open={previewOpen} title="Vista previa · Orden de exámenes" onClose={() => setPreviewOpen(false)}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Veramed · Borrador no emitido</p>
        <div className="mt-5 space-y-3">{selected.map((exam) => <div key={exam.name} className="rounded-xl border border-slate-200 p-4"><p className="font-semibold text-slate-900">{exam.name}</p><p className="mt-1 text-xs text-slate-500">Código FONASA: {exam.fonasaCode}</p>{exam.orderObservation ? <p className="mt-2 text-sm leading-6 text-slate-600">{exam.orderObservation}</p> : null}</div>)}</div>
        <dl className="mt-6 grid gap-4 border-t border-slate-200 pt-5 text-sm"><div><dt className="font-semibold text-slate-900">Diagnósticos</dt><dd className="mt-1 whitespace-pre-wrap text-slate-600">{diagnoses || "No informados"}</dd></div><div><dt className="font-semibold text-slate-900">Observaciones</dt><dd className="mt-1 whitespace-pre-wrap text-slate-600">{observations || "Sin observaciones"}</dd></div></dl>
      </PreviewModal>
    </div>
  );
}
