"use client";

import { useMemo, useState } from "react";
import { Field, inputClassName, IntegrationNotice, PageHeader, PreviewModal } from "@/app/portal-medicos/_components/PortalUi";
import { MEDICAL_SPECIALTIES } from "@/lib/medical-portal/specialties";

export default function ReferralBuilder() {
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [clinicalQuestion, setClinicalQuestion] = useState("");
  const [history, setHistory] = useState("");
  const [diagnoses, setDiagnoses] = useState("");
  const [priority, setPriority] = useState("habitual");
  const [observations, setObservations] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const matches = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase("es");
    if (!clean) return [];
    return MEDICAL_SPECIALTIES.filter((item) => item.toLocaleLowerCase("es").includes(clean)).slice(0, 10);
  }, [query]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Derivaciones" title="Emitir interconsulta" description="Selecciona una especialidad y organiza el motivo clínico antes de revisar la derivación." />
      <IntegrationNotice>Veramed no posee aún un modelo ni backend de interconsultas. El formulario y su vista previa están preparados, pero no emiten ni firman documentos.</IntegrationNotice>
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-6">
        <div className="relative max-w-2xl">
          <Field label="Especialidad a derivar"><input value={query} onChange={(event) => { setQuery(event.target.value); setSpecialty(""); }} className={inputClassName} placeholder="Buscar especialidad" autoComplete="off" /></Field>
          {query && !specialty ? <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl">{matches.length ? matches.map((item) => <button key={item} type="button" onClick={() => { setSpecialty(item); setQuery(item); }} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900">{item}</button>) : <p className="px-3 py-4 text-sm text-slate-500">Sin coincidencias.</p>}</div> : null}
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Motivo o pregunta clínica"><textarea value={clinicalQuestion} onChange={(event) => setClinicalQuestion(event.target.value)} className={`${inputClassName} min-h-32`} placeholder="Describe el objetivo de la evaluación por especialista" /></Field>
          <Field label="Antecedentes relevantes"><textarea value={history} onChange={(event) => setHistory(event.target.value)} className={`${inputClassName} min-h-32`} placeholder="Historia, tratamientos y resultados relevantes" /></Field>
          <Field label="Diagnósticos"><textarea value={diagnoses} onChange={(event) => setDiagnoses(event.target.value)} className={`${inputClassName} min-h-24`} /></Field>
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            <Field label="Prioridad"><select value={priority} onChange={(event) => setPriority(event.target.value)} className={inputClassName}><option value="habitual">Habitual</option><option value="preferente">Preferente</option><option value="urgente">Urgente</option></select></Field>
            <Field label="Observaciones"><textarea value={observations} onChange={(event) => setObservations(event.target.value)} className={`${inputClassName} min-h-24`} /></Field>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => setPreviewOpen(true)} disabled={!specialty || !clinicalQuestion.trim()} className="rounded-xl border border-emerald-300 px-5 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40">Vista previa</button><button type="button" disabled title="Backend de emisión pendiente" className="rounded-xl bg-slate-300 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed">Emitir interconsulta</button></div>
      </section>
      <PreviewModal open={previewOpen} title="Vista previa · Interconsulta" onClose={() => setPreviewOpen(false)}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Veramed · Borrador no emitido</p><h3 className="mt-4 text-2xl font-semibold text-slate-950">Derivación a {specialty}</h3>
        <dl className="mt-6 grid gap-5 text-sm"><div><dt className="font-semibold text-slate-900">Motivo o pregunta clínica</dt><dd className="mt-1 whitespace-pre-wrap leading-6 text-slate-600">{clinicalQuestion}</dd></div><div><dt className="font-semibold text-slate-900">Antecedentes relevantes</dt><dd className="mt-1 whitespace-pre-wrap leading-6 text-slate-600">{history || "No informados"}</dd></div><div><dt className="font-semibold text-slate-900">Diagnósticos</dt><dd className="mt-1 whitespace-pre-wrap leading-6 text-slate-600">{diagnoses || "No informados"}</dd></div><div><dt className="font-semibold text-slate-900">Prioridad</dt><dd className="mt-1 capitalize text-slate-600">{priority}</dd></div><div><dt className="font-semibold text-slate-900">Observaciones</dt><dd className="mt-1 whitespace-pre-wrap leading-6 text-slate-600">{observations || "Sin observaciones"}</dd></div></dl>
      </PreviewModal>
    </div>
  );
}
