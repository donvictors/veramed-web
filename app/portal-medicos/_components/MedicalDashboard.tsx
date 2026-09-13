"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PortalIcon from "@/app/portal-medicos/_components/PortalIcon";
import { Field, inputClassName, PageHeader, PreviewModal } from "@/app/portal-medicos/_components/PortalUi";
import { scheduleBlockLabels, type ScheduleBlockType } from "@/lib/medical-schedule";

type Appointment = { id: string; patientName: string; patientRut: string; patientEmail: string; patientPhone: string; notes: string; startsAt: string };
type ScheduleBlock = { id: string; type: ScheduleBlockType; startsAt: string; endsAt: string; slotDurationMinutes: number; slotCount: number; notes: string; appointments: Appointment[] };
type BlockDraft = { type: ScheduleBlockType; date: string; time: string; duration: string; slots: string; notes: string };

const monthFormatter = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" });
const dateFormatter = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });

function startOfDay(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function dateKey(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
function blankDraft(date: Date): BlockDraft {
  const now = new Date();
  const rounded = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), Math.ceil(now.getMinutes() / 15) * 15);
  return { type: "short_consultation", date: dateKey(date), time: timeFormatter.format(rounded), duration: "20", slots: "1", notes: "" };
}
function blockTone(type: ScheduleBlockType) {
  if (type === "blocked") return "border-slate-300 bg-slate-100";
  if (type === "home_visit") return "border-amber-200 bg-amber-50/60";
  return "border-emerald-200 bg-emerald-50/40";
}
async function apiJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "No pudimos completar la acción.");
  return payload;
}

export default function MedicalDashboard() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [blockModal, setBlockModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BlockDraft>(() => blankDraft(today));
  const [patientBlock, setPatientBlock] = useState<ScheduleBlock | null>(null);
  const [patientRut, setPatientRut] = useState("");
  const [patientNotes, setPatientNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const days = useMemo(() => {
    const firstWeekday = (visibleMonth.getDay() + 6) % 7;
    const count = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    return [...Array.from({ length: firstWeekday }, () => null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [visibleMonth]);

  const loadAgenda = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const from = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
      const to = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
      const payload = await apiJson(`/api/portal-medicos/schedule?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`);
      setBlocks(payload.blocks || []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos cargar tu agenda."); }
    finally { setLoading(false); }
  }, [visibleMonth]);

  useEffect(() => { void loadAgenda(); }, [loadAgenda]);

  const selectedBlocks = useMemo(() => blocks.filter((block) => dateKey(block.startsAt) === dateKey(selectedDate)), [blocks, selectedDate]);
  const patientCount = selectedBlocks.reduce((total, block) => total + block.appointments.length, 0);
  const activityDays = useMemo(() => new Set(blocks.filter((block) => block.appointments.length > 0).map((block) => dateKey(block.startsAt))), [blocks]);
  const blockedDays = useMemo(() => new Set(blocks.filter((block) => block.type === "blocked").map((block) => dateKey(block.startsAt))), [blocks]);

  function changeMonth(offset: number) { setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1)); }
  function goToday() { setSelectedDate(today); setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1)); }
  function openNewBlock() { setEditingId(null); setDraft(blankDraft(selectedDate)); setError(""); setBlockModal(true); }
  function openEditBlock(block: ScheduleBlock) {
    const starts = new Date(block.startsAt);
    setEditingId(block.id);
    setDraft({ type: block.type, date: dateKey(starts), time: timeFormatter.format(starts), duration: String(block.slotDurationMinutes), slots: String(block.slotCount), notes: block.notes });
    setError(""); setBlockModal(true);
  }

  async function saveBlock() {
    setSaving(true); setError("");
    try {
      const localStart = new Date(`${draft.date}T${draft.time}:00`);
      if (!Number.isFinite(localStart.getTime())) throw new Error("Indica una fecha y hora válidas.");
      const body = { type: draft.type, startsAt: localStart.toISOString(), slotDurationMinutes: Number(draft.duration), slotCount: draft.type === "blocked" ? 1 : Number(draft.slots), notes: draft.notes };
      await apiJson(editingId ? `/api/portal-medicos/schedule/${editingId}` : "/api/portal-medicos/schedule", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setBlockModal(false); setMessage(editingId ? "Bloque actualizado." : "Bloque creado en tu agenda."); await loadAgenda();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos guardar el bloque."); }
    finally { setSaving(false); }
  }

  async function deleteBlock(block: ScheduleBlock) {
    const label = block.type === "blocked" ? "este bloqueo" : "este bloque y sus citas";
    if (!window.confirm(`¿Quieres eliminar ${label}?`)) return;
    setError("");
    try { await apiJson(`/api/portal-medicos/schedule/${block.id}`, { method: "DELETE" }); setMessage("Bloque eliminado."); await loadAgenda(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos eliminar el bloque."); }
  }

  async function addPatient() {
    if (!patientBlock) return;
    setSaving(true); setError("");
    try {
      await apiJson(`/api/portal-medicos/schedule/${patientBlock.id}/appointments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rut: patientRut, notes: patientNotes }) });
      setPatientBlock(null); setPatientRut(""); setPatientNotes(""); setMessage("Paciente añadido al bloque."); await loadAgenda();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos añadir al paciente."); }
    finally { setSaving(false); }
  }

  async function removePatient(block: ScheduleBlock, appointment: Appointment) {
    if (!window.confirm(`¿Retirar a ${appointment.patientName} de este bloque?`)) return;
    setError("");
    try { await apiJson(`/api/portal-medicos/schedule/${block.id}/appointments?appointmentId=${encodeURIComponent(appointment.id)}`, { method: "DELETE" }); setMessage("Paciente retirado del bloque."); await loadAgenda(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos retirar al paciente."); }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Inicio" title="Agenda" description="Organiza tus bloques clínicos, asigna pacientes y reserva turnos no disponibles." aside={<button type="button" onClick={openNewBlock} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800">+ Nuevo bloque</button>} />
      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">{message}</div> : null}
      {error && !blockModal && !patientBlock ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-h-[430px] rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_20px_55px_-45px_rgba(15,23,42,0.45)]">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
            <div><h2 className="text-2xl font-semibold capitalize text-slate-950">{dateFormatter.format(selectedDate)}</h2><p className="mt-1 text-sm text-slate-500">Agenda clínica del día seleccionado</p></div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900"><PortalIcon name="calendar" className="h-5 w-5" />Pacientes citados: {patientCount}</div>
          </header>
          {loading ? <div className="grid min-h-[310px] place-items-center text-sm text-slate-500">Cargando agenda…</div> : selectedBlocks.length === 0 ? (
            <div className="flex min-h-[310px] flex-col items-center justify-center px-6 py-12 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><PortalIcon name="calendar" className="h-7 w-7" /></span><h3 className="mt-4 text-lg font-semibold text-slate-900">No hay bloques para este día.</h3><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Crea un bloque clínico para añadir pacientes o reserva un turno como no disponible.</p><button type="button" onClick={openNewBlock} className="mt-5 rounded-xl border border-emerald-300 px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50">Crear bloque</button></div>
          ) : (
            <div className="space-y-4 p-4 sm:p-6">
              {selectedBlocks.map((block) => {
                const available = block.slotCount - block.appointments.length;
                return <article key={block.id} className={`rounded-2xl border p-4 sm:p-5 ${blockTone(block.type)}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-950">{scheduleBlockLabels[block.type]}</h3><span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-600">{timeFormatter.format(new Date(block.startsAt))}–{timeFormatter.format(new Date(block.endsAt))}</span></div><p className="mt-2 text-sm text-slate-600">{block.type === "blocked" ? `${block.slotDurationMinutes} min reservados` : `${block.slotDurationMinutes} min por paciente · ${block.appointments.length}/${block.slotCount} cupos ocupados`}</p>{block.notes ? <p className="mt-2 text-sm text-slate-600">{block.notes}</p> : null}</div>
                    <div className="flex gap-2"><button type="button" onClick={() => openEditBlock(block)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Editar</button><button type="button" onClick={() => void deleteBlock(block)} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">Eliminar</button></div>
                  </div>
                  {block.type !== "blocked" ? <div className="mt-4 border-t border-emerald-200/70 pt-4">
                    {block.appointments.length ? <div className="space-y-2">{block.appointments.map((appointment) => <div key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white bg-white/90 px-4 py-3"><div><p className="text-sm font-bold text-slate-900"><span className="mr-2 text-emerald-700">{timeFormatter.format(new Date(appointment.startsAt))}</span>{appointment.patientName}</p><p className="mt-1 text-xs text-slate-500">{appointment.patientRut}{appointment.patientPhone ? ` · ${appointment.patientPhone}` : ""}</p>{appointment.notes ? <p className="mt-1 text-xs text-slate-600">{appointment.notes}</p> : null}</div><button type="button" onClick={() => void removePatient(block, appointment)} className="text-xs font-bold text-red-700 hover:underline">Retirar</button></div>)}</div> : <p className="text-sm text-slate-500">Bloque creado, todavía sin pacientes.</p>}
                    {available > 0 ? <button type="button" onClick={() => { setPatientBlock(block); setPatientRut(""); setPatientNotes(""); setError(""); }} className="mt-3 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800">+ Añadir paciente</button> : <p className="mt-3 text-xs font-semibold text-emerald-800">Bloque completo</p>}
                  </div> : null}
                </article>;
              })}
            </div>
          )}
        </section>

        <aside className="h-fit rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.45)]">
          <div className="flex items-center justify-between gap-2"><button type="button" onClick={() => changeMonth(-1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Mes anterior"><PortalIcon name="chevron" className="h-5 w-5 rotate-90" /></button><p className="text-sm font-semibold capitalize text-slate-900">{monthFormatter.format(visibleMonth)}</p><button type="button" onClick={() => changeMonth(1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Mes siguiente"><PortalIcon name="chevron" className="h-5 w-5 -rotate-90" /></button></div>
          <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">{["L", "M", "M", "J", "V", "S", "D"].map((day, index) => <span key={`${day}-${index}`} className="py-2">{day}</span>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} />;
              const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
              const selected = date.getTime() === selectedDate.getTime(); const isToday = date.getTime() === today.getTime(); const key = dateKey(date); const hasActivity = activityDays.has(key); const hasBlocking = blockedDays.has(key);
              return <button key={day} type="button" onClick={() => setSelectedDate(date)} className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-medium transition ${selected ? "bg-emerald-900 text-white" : isToday ? "border border-emerald-400 text-emerald-900" : "text-slate-600 hover:bg-emerald-50"}`} aria-label={`${dateFormatter.format(date)}${hasActivity ? ", con pacientes citados" : ""}${hasBlocking ? ", con bloqueo" : ""}`} aria-pressed={selected}><span>{day}</span><span className="absolute bottom-1 flex h-1.5 items-center gap-0.5">{hasActivity ? <span className={`h-1.5 w-1.5 rounded-full ${selected ? "bg-lime-300" : "bg-emerald-500"}`} /> : null}{hasBlocking ? <span className={`h-1 w-2 rounded-full ${selected ? "bg-slate-200" : "bg-slate-500"}`} /> : null}</span></button>;
            })}
          </div>
          <div className="mt-6 border-t border-slate-200 pt-5"><button type="button" onClick={goToday} className="rounded-xl border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">Hoy</button><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-500" /> Paciente agendado</span><span className="inline-flex items-center gap-1.5"><i className="h-1.5 w-3 rounded-full bg-slate-500" /> Turno bloqueado</span></div></div>
        </aside>
      </div>

      <PreviewModal open={blockModal} title={editingId ? "Editar bloque" : "Nuevo bloque de agenda"} onClose={() => setBlockModal(false)}>
        <div className="grid gap-5">
          <Field label="Tipo de bloque"><select className={inputClassName} value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as ScheduleBlockType }))}>{Object.entries(scheduleBlockLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Fecha"><input className={inputClassName} type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} /></Field><Field label="Hora de inicio"><input className={inputClassName} type="time" step="300" value={draft.time} onChange={(event) => setDraft((current) => ({ ...current, time: event.target.value }))} /></Field></div>
          <div className="grid gap-4 sm:grid-cols-2"><Field label={draft.type === "blocked" ? "Duración del bloqueo" : "Duración por atención"} hint="Entre 5 minutos y 8 horas."><div className="relative"><input className={`${inputClassName} pr-16`} type="number" min="5" max="480" step="5" value={draft.duration} onChange={(event) => setDraft((current) => ({ ...current, duration: event.target.value }))} /><span className="absolute right-4 top-3 text-sm text-slate-500">min</span></div></Field>{draft.type !== "blocked" ? <Field label="Cantidad de cupos" hint="El bloque termina al completar todos los cupos."><input className={inputClassName} type="number" min="1" max="24" value={draft.slots} onChange={(event) => setDraft((current) => ({ ...current, slots: event.target.value }))} /></Field> : null}</div>
          <Field label="Nota interna (opcional)"><textarea className={`${inputClassName} min-h-24 resize-y`} maxLength={500} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder={draft.type === "blocked" ? "Ej. Reunión clínica" : "Ej. Atenciones presenciales"} /></Field>
          {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setBlockModal(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Cancelar</button><button type="button" disabled={saving} onClick={() => void saveBlock()} className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? "Guardando…" : "Guardar bloque"}</button></div>
        </div>
      </PreviewModal>

      <PreviewModal open={Boolean(patientBlock)} title="Añadir paciente al bloque" onClose={() => setPatientBlock(null)}>
        <div className="grid gap-5"><p className="text-sm leading-6 text-slate-600">Ingresa el RUT de un paciente con cuenta registrada en Veramed. Sus datos se incorporarán desde su perfil.</p><Field label="RUT del paciente"><input className={inputClassName} value={patientRut} onChange={(event) => setPatientRut(event.target.value)} placeholder="12.345.678-5" autoFocus /></Field><Field label="Nota para esta atención (opcional)"><textarea className={`${inputClassName} min-h-24 resize-y`} maxLength={500} value={patientNotes} onChange={(event) => setPatientNotes(event.target.value)} placeholder="Motivo o indicación breve" /></Field>{error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}<div className="flex justify-end gap-3"><button type="button" onClick={() => setPatientBlock(null)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Cancelar</button><button type="button" disabled={saving || !patientRut.trim()} onClick={() => void addPatient()} className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? "Añadiendo…" : "Añadir paciente"}</button></div></div>
      </PreviewModal>
    </div>
  );
}
