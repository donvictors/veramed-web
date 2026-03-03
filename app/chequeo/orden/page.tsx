"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type TestItem = { name: string; why: string };

type Stored = {
  input: {
    age: number;
    sex: "M" | "F";
    weightKg: number;
    heightCm: number;
    smoking: "never" | "former" | "current";
    sexualActivity: "yes" | "no";
    pregnancy: "yes" | "no" | "unknown";
  };
  rec: {
    summary: string;
    tests: TestItem[];
    notes: string[];
  };
};

export default function OrderPage() {
  const [data, setData] = useState<Stored | null>(null);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("veramed_checkup");
    const st = localStorage.getItem("veramed_checkup_status");

    if (raw) setData(JSON.parse(raw));
    if (st) {
      const s = JSON.parse(st) as { status: "queued" | "approved" };
      setApproved(s.status === "approved");
    }
  }, []);

  const orderId = useMemo(() => {
    // ID simple (MVP). Después será UUID en backend.
    const base = Date.now().toString().slice(-8);
    return `VM-${base}`;
  }, []);

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <h1 className="text-2xl font-semibold">No hay datos del chequeo</h1>
          <p className="mt-2 text-slate-600">Vuelve a generar un chequeo primero.</p>
          <Link href="/chequeo" className="mt-6 inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm text-white">
            Ir a chequeo
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Orden de exámenes</h1>
            <p className="text-sm text-slate-600">ID: {orderId}</p>
          </div>

          <div className="flex gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Imprimir / Guardar PDF
            </button>
            <Link
              href="/chequeo/estado"
              className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              Volver
            </Link>
          </div>
        </div>

        {!approved && (
          <div className="mb-6 rounded-2xl border bg-amber-50 p-4 print:hidden">
            <p className="text-sm font-semibold">Aún no aparece como aprobada</p>
            <p className="mt-1 text-sm text-slate-700">
              En el MVP esto depende del estado simulado. Vuelve a <Link className="underline" href="/chequeo/estado">estado</Link>.
            </p>
          </div>
        )}

        {/* DOCUMENTO IMPRIMIBLE */}
        <section className="rounded-2xl border bg-white p-8 shadow-sm print:shadow-none">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500">VERAMED</p>
              <h2 className="text-xl font-semibold">Orden médica de exámenes</h2>
              <p className="mt-1 text-sm text-slate-600">
                Chequeo preventivo (MVP)
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{new Date().toLocaleString()}</p>
              <p className="text-xs text-slate-500">Santiago, Chile</p>
            </div>
          </div>

          <hr className="my-6" />

          <div className="grid gap-3 text-sm md:grid-cols-2">
            <Info label="Edad" value={`${data.input.age}`} />
            <Info label="Sexo" value={data.input.sex === "M" ? "Masculino" : "Femenino"} />
            <Info label="Peso" value={`${data.input.weightKg} kg`} />
            <Info label="Talla" value={`${data.input.heightCm} cm`} />
            <Info label="Tabaco" value={formatSmoking(data.input.smoking)} />
            <Info label="Actividad sexual" value={data.input.sexualActivity === "yes" ? "Sí" : "No"} />
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold">Indicación</p>
            <p className="mt-1 text-sm text-slate-700">{data.rec.summary}</p>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold">Exámenes solicitados</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-800">
              {data.rec.tests.map((t) => (
                <li key={t.name}>{t.name}</li>
              ))}
            </ul>
          </div>

          {data.rec.notes.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold">Notas</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                {data.rec.notes.map((n, idx) => (
                  <li key={idx}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          <hr className="my-6" />

          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <p className="font-semibold">Médico validador</p>
              <p className="text-slate-700">Pendiente (MVP)</p>
              <p className="text-xs text-slate-500">
                En producción: nombre + RUT + firma electrónica
              </p>
            </div>
            <div className="text-slate-600 md:text-right">
              <p className="font-semibold text-slate-800">Advertencia</p>
              <p className="text-xs">
                Este documento es parte de un MVP. No reemplaza evaluación clínica. No usar en urgencias.
              </p>
            </div>
          </div>
        </section>

        <p className="mt-6 text-xs text-slate-500 print:hidden">
          Tip: usa “Imprimir” y selecciona “Guardar como PDF”.
        </p>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function formatSmoking(s: "never" | "former" | "current") {
  if (s === "never") return "Nunca";
  if (s === "former") return "Ex fumador";
  return "Fumador actual";
}