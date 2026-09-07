"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/app/portal-medicos/_components/PortalUi";
import PortalIcon from "@/app/portal-medicos/_components/PortalIcon";

const monthFormatter = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" });
const dateFormatter = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default function MedicalDashboard() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const days = useMemo(() => {
    const firstWeekday = (visibleMonth.getDay() + 6) % 7;
    const count = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    return [...Array.from({ length: firstWeekday }, () => null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [visibleMonth]);

  function changeMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function goToday() {
    setSelectedDate(today);
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Inicio" title="Agenda" description="Una vista rápida de tu jornada clínica y accesos frecuentes del portal." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-h-[430px] rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_20px_55px_-45px_rgba(15,23,42,0.45)]">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-2xl font-semibold capitalize text-slate-950">{dateFormatter.format(selectedDate)}</h2>
              <p className="mt-1 text-sm text-slate-500">Agenda clínica del día seleccionado</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900">
              <PortalIcon name="calendar" className="h-5 w-5" />Pacientes citados: 0
            </div>
          </header>
          <div className="flex min-h-[310px] flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><PortalIcon name="calendar" className="h-7 w-7" /></span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No tienes pacientes citados para este día.</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">La agenda queda preparada para conectarse cuando Veramed incorpore un backend de citas.</p>
          </div>
        </section>

        <aside className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.45)]">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => changeMonth(-1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Mes anterior"><PortalIcon name="chevron" className="h-5 w-5 rotate-90" /></button>
            <p className="text-sm font-semibold capitalize text-slate-900">{monthFormatter.format(visibleMonth)}</p>
            <button type="button" onClick={() => changeMonth(1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Mes siguiente"><PortalIcon name="chevron" className="h-5 w-5 -rotate-90" /></button>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">
            {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => <span key={`${day}-${index}`} className="py-2">{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} />;
              const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
              const selected = date.getTime() === selectedDate.getTime();
              const isToday = date.getTime() === today.getTime();
              return (
                <button key={day} type="button" onClick={() => setSelectedDate(date)} className={`aspect-square rounded-full text-sm font-medium transition ${selected ? "bg-emerald-900 text-white" : isToday ? "border border-emerald-400 text-emerald-900" : "text-slate-600 hover:bg-emerald-50"}`} aria-label={dateFormatter.format(date)} aria-pressed={selected}>{day}</button>
              );
            })}
          </div>
          <div className="mt-6 border-t border-slate-200 pt-5">
            <button type="button" onClick={goToday} className="rounded-xl border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">Hoy</button>
            <p className="mt-4 text-xs leading-5 text-slate-500">Agenda preparada para integración; no se crean citas ficticias.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
