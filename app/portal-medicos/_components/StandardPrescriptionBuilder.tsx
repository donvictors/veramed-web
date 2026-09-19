"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import PortalIcon from "@/app/portal-medicos/_components/PortalIcon";
import { Field, inputClassName, PageHeader, PreviewModal } from "@/app/portal-medicos/_components/PortalUi";
import {
  PRESCRIPTION_DOSE_UNITS,
  PRESCRIPTION_DURATION_UNITS,
  PRESCRIPTION_FREQUENCY_UNITS,
  prescriptionInstruction,
  prescriptionPatientSchema,
  prescriptionPatientFullName,
  type PrescriptionItemInput,
  type PrescriptionPatientInput,
} from "@/lib/prescriptions";

type IssueResult = {
  id: string;
  verificationCode: string;
  emailSent: boolean;
  emailError: string;
  downloadUrl: string;
};

const medicationExamples = [
  "Losartán 50 mg comprimido",
  "Losartán 100 mg comprimido",
  "Amlodipino 5 mg comprimido",
  "Metformina 850 mg comprimido",
  "Atorvastatina 20 mg comprimido",
  "Levotiroxina 50 mcg comprimido",
  "Omeprazol 20 mg cápsula",
  "Paracetamol 500 mg comprimido",
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(): PrescriptionItemInput {
  return {
    id: "",
    name: "",
    commercial: "",
    dose: "",
    doseUnit: "comprimido(s)",
    frequency: "",
    frequencyUnit: "horas",
    duration: "",
    durationUnit: "días",
    startDate: today(),
    observations: "",
  };
}

function emptyManualPatient(rut: string): PrescriptionPatientInput {
  return {
    userId: null,
    firstName: "",
    paternalSurname: "",
    maternalSurname: "",
    rut,
    birthDate: "",
    email: "",
    phone: "",
    address: "",
  };
}

export default function StandardPrescriptionBuilder() {
  const [rut, setRut] = useState("");
  const [patient, setPatient] = useState<PrescriptionPatientInput | null>(null);
  const [manualPatient, setManualPatient] = useState<PrescriptionPatientInput | null>(null);
  const [manualError, setManualError] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [draft, setDraft] = useState<PrescriptionItemInput>(emptyDraft);
  const [items, setItems] = useState<PrescriptionItemInput[]>([]);
  const [editingId, setEditingId] = useState("");
  const [formError, setFormError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState("");
  const [result, setResult] = useState<IssueResult | null>(null);
  const matchingMedications = useMemo(() => {
    const query = draft.name.trim().toLocaleLowerCase("es");
    if (query.length < 2) return [];
    return medicationExamples.filter((item) => item.toLocaleLowerCase("es").includes(query)).slice(0, 6);
  }, [draft.name]);

  function updateDraft<K extends keyof PrescriptionItemInput>(key: K, value: PrescriptionItemInput[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function searchPatient() {
    if (!rut.trim() || searching) return;
    setSearching(true);
    setSearchError("");
    setResult(null);
    try {
      const response = await fetch(`/api/portal-medicos/prescriptions/patients?rut=${encodeURIComponent(rut)}`, { cache: "no-store" });
      const payload = await response.json() as { patient?: PrescriptionPatientInput; error?: string };
      if (response.status === 404) {
        setPatient(null);
        setManualPatient(emptyManualPatient(rut.trim()));
        setManualError("");
        return;
      }
      if (!response.ok || !payload.patient) throw new Error(payload.error || "No encontramos al paciente.");
      setManualPatient(null);
      setManualError("");
      setPatient(payload.patient);
      setRut(payload.patient.rut);
    } catch (error) {
      setPatient(null);
      setSearchError(error instanceof Error ? error.message : "No pudimos buscar al paciente.");
    } finally {
      setSearching(false);
    }
  }

  function updateManualPatient<K extends keyof PrescriptionPatientInput>(key: K, value: PrescriptionPatientInput[K]) {
    setManualPatient((current) => current ? { ...current, [key]: value } : current);
    setManualError("");
  }

  function confirmManualPatient() {
    if (!manualPatient) return;
    const parsed = prescriptionPatientSchema.safeParse(manualPatient);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      const messages: Record<string, string> = {
        firstName: "Ingresa el nombre del paciente.",
        birthDate: "Ingresa una fecha de nacimiento válida.",
        email: "Ingresa un correo electrónico válido.",
      };
      setManualError(messages[String(field)] || "Revisa los datos ingresados del paciente.");
      return;
    }
    setPatient(parsed.data);
    setManualPatient(null);
    setManualError("");
  }

  function saveItem() {
    const durationReady = ["Permanente", "SOS"].includes(draft.durationUnit) || Number(draft.duration.replace(",", ".")) > 0;
    if (!draft.name.trim()) return setFormError("Ingresa el medicamento o principio activo.");
    if (!(Number(draft.dose.replace(",", ".")) > 0)) return setFormError("Completa una dosis válida.");
    if (!(Number(draft.frequency.replace(",", ".")) > 0)) return setFormError("Completa una frecuencia válida.");
    if (!durationReady) return setFormError("Completa la duración del tratamiento.");
    const item = { ...draft, id: editingId || crypto.randomUUID() };
    setItems((current) => editingId
      ? current.map((entry) => entry.id === editingId ? item : entry)
      : [...current, item]);
    setDraft(emptyDraft());
    setEditingId("");
    setFormError("");
  }

  function editItem(item: PrescriptionItemInput) {
    setDraft(item);
    setEditingId(item.id);
    window.scrollTo({ top: 220, behavior: "smooth" });
  }

  async function issuePrescription() {
    if (!patient || !confirmed || issuing) return;
    setIssuing(true);
    setIssueError("");
    try {
      const response = await fetch("/api/portal-medicos/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient, items, confirmation: true }),
      });
      const payload = await response.json() as IssueResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "No pudimos emitir la receta.");
      setResult(payload);
      setConfirmOpen(false);
      setPreviewOpen(false);
      setItems([]);
      setDraft(emptyDraft());
      setConfirmed(false);
    } catch (error) {
      setIssueError(error instanceof Error ? error.message : "No pudimos emitir la receta.");
    } finally {
      setIssuing(false);
    }
  }

  const patientName = patient ? prescriptionPatientFullName(patient) : "";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Medicamentos"
        title="Receta médica electrónica"
        description="Selecciona al paciente, registra uno o más medicamentos y revisa la receta antes de firmarla y enviarla."
        aside={<Link href="/portal-medicos/mis-recetas" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"><PortalIcon name="document" className="h-4 w-4" />Mis recetas</Link>}
      />

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <Field label="RUT del paciente">
            <div className="flex gap-2">
              <input value={rut} onChange={(event) => { setRut(event.target.value); setPatient(null); setManualPatient(null); setSearchError(""); setManualError(""); }} onKeyDown={(event) => { if (event.key === "Enter") void searchPatient(); }} className={`${inputClassName} md:w-80`} placeholder="12.345.678-5" autoComplete="off" />
              <button type="button" onClick={() => void searchPatient()} disabled={searching || !rut.trim()} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50">{searching ? "Buscando..." : "Buscar"}</button>
            </div>
          </Field>
          {patient || manualPatient ? <button type="button" onClick={() => { setPatient(null); setManualPatient(null); setRut(""); setResult(null); setSearchError(""); setManualError(""); }} className="text-sm font-semibold text-slate-500 hover:text-rose-700">Cambiar paciente</button> : null}
        </div>
        {searchError ? <p className="mt-3 text-sm font-medium text-rose-700">{searchError}</p> : null}
        {manualPatient ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
            <div><h2 className="font-semibold text-slate-950">Paciente no registrado</h2><p className="mt-1 text-sm text-slate-600">Ingresa sus datos para continuar con la receta.</p></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Nombre"><input value={manualPatient.firstName} onChange={(event) => updateManualPatient("firstName", event.target.value)} className={inputClassName} autoComplete="given-name" /></Field>
              <Field label="Apellido paterno"><input value={manualPatient.paternalSurname} onChange={(event) => updateManualPatient("paternalSurname", event.target.value)} className={inputClassName} autoComplete="family-name" /></Field>
              <Field label="Apellido materno"><input value={manualPatient.maternalSurname} onChange={(event) => updateManualPatient("maternalSurname", event.target.value)} className={inputClassName} /></Field>
              <Field label="Fecha de nacimiento"><input type="date" value={manualPatient.birthDate} onChange={(event) => updateManualPatient("birthDate", event.target.value)} className={inputClassName} /></Field>
              <Field label="Correo electrónico"><input type="email" value={manualPatient.email} onChange={(event) => updateManualPatient("email", event.target.value)} className={inputClassName} autoComplete="email" /></Field>
              <Field label="Teléfono"><input value={manualPatient.phone} onChange={(event) => updateManualPatient("phone", event.target.value)} className={inputClassName} autoComplete="tel" /></Field>
              <div className="md:col-span-2"><Field label="Dirección"><input value={manualPatient.address} onChange={(event) => updateManualPatient("address", event.target.value)} className={inputClassName} autoComplete="street-address" /></Field></div>
            </div>
            {manualError ? <p className="mt-4 text-sm font-medium text-rose-700">{manualError}</p> : null}
            <button type="button" onClick={confirmManualPatient} className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600">Usar estos datos</button>
          </div>
        ) : null}
        {patient ? (
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-700 text-white"><PortalIcon name="user" /></span>
              <div><p className="font-semibold text-slate-950">{patientName}</p><p className="mt-0.5 text-xs text-slate-600">{patient.rut} · {patient.email}</p></div>
            </div>
            <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800">{patient.userId ? "Paciente registrado" : "Datos ingresados manualmente"}</span>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className={`rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-6 ${patient ? "" : "pointer-events-none opacity-55"}`}>
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4"><div><h2 className="text-lg font-semibold text-slate-950">{editingId ? "Editar medicamento" : "Agregar medicamento"}</h2><p className="mt-1 text-xs text-slate-500">Registra la presentación exacta indicada por el médico.</p></div><PortalIcon name="pill" className="h-6 w-6 text-emerald-700" /></div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="relative md:col-span-2">
              <Field label="Medicamento o principio activo">
                <input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} className={inputClassName} placeholder="Ej. Losartán 50 mg comprimido" autoComplete="off" />
              </Field>
              {matchingMedications.length && !medicationExamples.includes(draft.name) ? <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">{matchingMedications.map((name) => <button key={name} type="button" onClick={() => updateDraft("name", name)} className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm hover:bg-emerald-50 last:border-0">{name}</button>)}</div> : null}
            </div>
            <div className="md:col-span-2"><Field label="Recomendación comercial" hint="Opcional; no reemplaza el nombre genérico ni la presentación."><input value={draft.commercial} onChange={(event) => updateDraft("commercial", event.target.value)} className={inputClassName} placeholder="Opcional" /></Field></div>
            <Field label="Posología"><div className="grid grid-cols-[1fr_160px] gap-2"><input value={draft.dose} onChange={(event) => updateDraft("dose", event.target.value)} className={inputClassName} inputMode="decimal" placeholder="1" /><select value={draft.doseUnit} onChange={(event) => updateDraft("doseUnit", event.target.value as PrescriptionItemInput["doseUnit"])} className={inputClassName}>{PRESCRIPTION_DOSE_UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></div></Field>
            <Field label="Cada"><div className="grid grid-cols-[1fr_160px] gap-2"><input value={draft.frequency} onChange={(event) => updateDraft("frequency", event.target.value)} className={inputClassName} inputMode="decimal" placeholder="12" /><select value={draft.frequencyUnit} onChange={(event) => updateDraft("frequencyUnit", event.target.value as PrescriptionItemInput["frequencyUnit"])} className={inputClassName}>{PRESCRIPTION_FREQUENCY_UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></div></Field>
            <Field label="Duración"><div className="grid grid-cols-[1fr_160px] gap-2"><input value={draft.duration} onChange={(event) => updateDraft("duration", event.target.value)} className={inputClassName} inputMode="decimal" placeholder="30" disabled={["Permanente", "SOS"].includes(draft.durationUnit)} /><select value={draft.durationUnit} onChange={(event) => updateDraft("durationUnit", event.target.value as PrescriptionItemInput["durationUnit"])} className={inputClassName}>{PRESCRIPTION_DURATION_UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></div></Field>
            <Field label="Inicio del tratamiento"><input type="date" value={draft.startDate} onChange={(event) => updateDraft("startDate", event.target.value)} className={inputClassName} /></Field>
            <div className="md:col-span-2"><Field label="Observaciones"><textarea value={draft.observations} onChange={(event) => updateDraft("observations", event.target.value)} className={`${inputClassName} min-h-24 resize-y`} placeholder="Indicaciones adicionales para el paciente" /></Field></div>
          </div>
          {formError ? <p className="mt-4 text-sm font-medium text-rose-700">{formError}</p> : null}
          <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={saveItem} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600">{editingId ? "Guardar cambios" : "Agregar a la receta"}</button>{editingId ? <button type="button" onClick={() => { setDraft(emptyDraft()); setEditingId(""); setFormError(""); }} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button> : null}</div>
        </section>

        <aside className="h-fit rounded-[1.5rem] border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between"><h2 className="font-semibold text-slate-950">Receta actual</h2><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">{items.length}</span></div>
          {items.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">Selecciona un paciente y agrega sus medicamentos.</p> : <div className="mt-4 space-y-3">{items.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 p-4"><p className="font-semibold text-slate-900">{item.name}</p><p className="mt-1 text-xs leading-5 text-slate-500">{prescriptionInstruction(item)}</p><div className="mt-3 flex gap-3 text-xs font-semibold"><button type="button" onClick={() => editItem(item)} className="text-emerald-800 hover:underline">Editar</button><button type="button" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} className="text-rose-700 hover:underline">Eliminar</button></div></article>)}</div>}
          <div className="mt-5 grid gap-2"><button type="button" onClick={() => setPreviewOpen(true)} disabled={!patient || items.length === 0} className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40">Vista previa</button>{items.length ? <button type="button" onClick={() => setItems([])} className="py-2 text-xs font-semibold text-rose-700 hover:underline">Eliminar todos</button> : null}</div>
        </aside>
      </div>

      {result ? <section className={`rounded-[1.5rem] border p-5 ${result.emailSent ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><h2 className="font-semibold text-slate-950">Receta firmada correctamente</h2><p className="mt-2 text-sm text-slate-700">Código {result.verificationCode}. {result.emailSent ? "El correo fue enviado al paciente con el PDF adjunto." : `El PDF quedó guardado, pero el correo no pudo enviarse: ${result.emailError}`}</p><a href={result.downloadUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"><PortalIcon name="external" className="h-4 w-4" />Abrir receta firmada</a></section> : null}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">Este módulo es para recetas simples. Los medicamentos sujetos a receta cheque o control legal especial deben emitirse mediante el sistema oficial correspondiente.</div>

      <PreviewModal open={previewOpen} title="Vista previa · Receta médica" onClose={() => setPreviewOpen(false)}><div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5"><span className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 rotate-[-34deg] text-6xl font-black tracking-widest text-emerald-50">BORRADOR</span><div className="relative"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Veramed</p><h3 className="mt-2 text-2xl font-semibold">Receta médica</h3><p className="mt-1 text-xs text-slate-500">Vista previa sin firma</p></div><div className="text-right text-xs text-slate-500"><p className="font-semibold text-slate-800">{patientName}</p><p>{patient?.rut}</p></div></div><ol className="mt-5 space-y-5">{items.map((item, index) => <li key={item.id}><p className="text-xs font-bold text-emerald-700">{String(index + 1).padStart(2, "0")}</p><p className="mt-1 font-semibold text-slate-950">{item.name}</p>{item.commercial ? <p className="mt-1 text-sm text-slate-600">Recomendación comercial: {item.commercial}</p> : null}<p className="mt-2 text-sm text-slate-700">{prescriptionInstruction(item)} Inicio: {item.startDate.split("-").reverse().join("-")}.</p>{item.observations ? <p className="mt-1 text-sm text-slate-600">Observaciones: {item.observations}</p> : null}</li>)}</ol></div></div><div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setPreviewOpen(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold">Seguir editando</button><button type="button" onClick={() => { setPreviewOpen(false); setConfirmOpen(true); }} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600">Firmar y enviar</button></div></PreviewModal>

      <PreviewModal open={confirmOpen} title="Confirmar datos del paciente" onClose={() => setConfirmOpen(false)}>{patient ? <><div className="grid gap-4 md:grid-cols-2"><Field label="Paciente"><input value={patientName} readOnly className={`${inputClassName} bg-slate-50`} /></Field><Field label="RUT"><input value={patient.rut} readOnly className={`${inputClassName} bg-slate-50`} /></Field><Field label="Correo electrónico"><input type="email" value={patient.email} onChange={(event) => setPatient({ ...patient, email: event.target.value })} className={inputClassName} /></Field><Field label="Teléfono"><input value={patient.phone} onChange={(event) => setPatient({ ...patient, phone: event.target.value })} className={inputClassName} /></Field><div className="md:col-span-2"><Field label="Dirección"><input value={patient.address} onChange={(event) => setPatient({ ...patient, address: event.target.value })} className={inputClassName} /></Field></div></div><label className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-slate-700"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-700" /><span>Confirmo que revisé la identidad del paciente, los medicamentos, la posología y la duración. Autorizo la firma electrónica y el envío al correo indicado.</span></label>{issueError ? <p className="mt-4 text-sm font-medium text-rose-700">{issueError}</p> : null}<div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setConfirmOpen(false)} disabled={issuing} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold">Cerrar</button><button type="button" onClick={() => void issuePrescription()} disabled={!confirmed || issuing || !patient.email.trim()} className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50">{issuing ? "Firmando y enviando..." : "Confirmar emisión"}</button></div></> : null}</PreviewModal>
    </div>
  );
}
