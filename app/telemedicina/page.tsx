"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import NewServiceCheckout from "@/components/NewServiceCheckout";

type Slot = {
  clinicianId: string;
  clinicianName: string;
  startsAt: string;
  durationMinutes: number;
};

export default function TelemedicinePage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [message, setMessage] = useState("");
  const [appointmentId, setAppointmentId] = useState("");

  useEffect(() => {
    fetch("/api/telemedicine")
      .then((response) => response.json())
      .then((payload) => setSlots(payload.slots || []))
      .catch(() => setSlots([]));
  }, []);

  async function reserve(slot: Slot) {
    const source = new URLSearchParams(window.location.search).get("source") || "direct";
    const response = await fetch("/api/telemedicine", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clinicianId: slot.clinicianId,
        startsAt: slot.startsAt,
        sourceFlow: source,
      }),
    });
    const body = await response.json();
    if (response.status === 401) {
      setMessage("Ingresa a tu cuenta para reservar este horario.");
      return;
    }
    if (!response.ok) {
      setMessage(body.error);
      return;
    }
    setAppointmentId(body.id);
    setMessage("Horario seleccionado. Confirma el pago para reservarlo.");
  }

  return (
    <main className="veramed-page min-h-screen px-5 py-12">
      <div className="mx-auto max-w-2xl">
        <p className="veramed-kicker">Telemedicina Veramed</p>
        <h1 className="veramed-display mt-3 text-4xl">Evaluación médica · 20 minutos</h1>
        <p className="mt-4 text-slate-600">
          La consulta puede terminar en una receta, otra alternativa o en la recomendación de no
          usar medicamentos, según la evaluación.
        </p>
        <section className="veramed-panel mt-8 p-6">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-sm text-slate-500">Precio</span>
              <strong className="block text-2xl">$19.990</strong>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800">
              20 minutos
            </span>
          </div>
          {!appointmentId ? (
            <>
              <h2 className="mt-7 font-semibold">Horarios disponibles</h2>
              {slots.length ? (
                <div className="mt-3 grid gap-3">
                  {slots.map((slot) => (
                    <button
                      key={slot.clinicianId + slot.startsAt}
                      onClick={() => reserve(slot)}
                      className="veramed-secondary-button justify-between px-4 py-3"
                    >
                      <span>
                        {new Intl.DateTimeFormat("es-CL", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(slot.startsAt))}
                      </span>
                      <span>{slot.clinicianName}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  No hay horarios publicados por el equipo médico en este momento.
                </p>
              )}
            </>
          ) : (
            <NewServiceCheckout
              orderId={appointmentId}
              baseAmount={19990}
              requestType="telemedicine"
              onError={setMessage}
            />
          )}
          {message && (
            <p className="mt-4 text-sm font-medium">
              {message}{" "}
              {message.startsWith("Ingresa") && (
                <Link href="/ingresar" className="text-emerald-700 underline">
                  Ingresar
                </Link>
              )}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
