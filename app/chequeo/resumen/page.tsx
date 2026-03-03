"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function SummaryPage() {
  const router = useRouter();
  const [data, setData] = useState<Stored | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("veramed_checkup");
    if (!raw) {
      router.replace("/chequeo");
      return;
    }
    setData(JSON.parse(raw));
  }, [router]);

  function queueValidation() {
    localStorage.setItem(
      "veramed_checkup_status",
      JSON.stringify({ status: "queued", queuedAt: Date.now() })
    );
    router.push("/chequeo/estado");
  }

  if (!data) return null;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Resumen del chequeo</h1>
            <p className="mt-2 text-slate-600">{data.rec.summary}</p>
          </div>

          <Link href="/chequeo" className="text-sm text-slate-600 hover:text-slate-900">
            Editar
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border bg-slate-50 p-6">
          <h2 className="text-sm font-semibold">Exámenes recomendados</h2>
          <div className="mt-4 grid gap-3">
            {data.rec.tests.map((t) => (
              <div key={t.name} className="rounded-xl border bg-white p-4">
                <p className="text-sm font-medium">{t.name}</p>
                <p className="mt-1 text-sm text-slate-600">{t.why}</p>
              </div>
            ))}
          </div>

          {data.rec.notes.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold">Notas</h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                {data.rec.notes.map((n, idx) => (
                  <li key={idx}>{n}</li>
                ))}
              </ul>
            </>
          )}

          <button
            onClick={queueValidation}
            className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
          >
            Enviar a validación médica
          </button>

          <p className="mt-3 text-xs text-slate-500">
            MVP: validación simulada. Luego conectamos pago + cola + PDF.
          </p>
        </div>
      </div>
    </main>
  );
}