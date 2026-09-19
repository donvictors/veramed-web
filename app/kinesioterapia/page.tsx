"use client";

import Link from "next/link";
import { useState } from "react";
import NewServiceCheckout from "@/components/NewServiceCheckout";

export default function KinesiologyPage() {
  const [hasDiagnosis, setHasDiagnosis] = useState<"" | "yes" | "no">("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ id: string; outcome: string; priceClp: number | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!file) return setError("Sube el documento donde aparece tu diagnóstico.");
    setLoading(true); setError("");
    const form = new FormData(); form.set("hasDiagnosis", "yes"); form.set("document", file);
    const response = await fetch("/api/new-services/kinesiology", { method: "POST", body: form });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) return setError(payload.error || "No pudimos revisar el documento.");
    setResult(payload);
  }

  return <main className="veramed-page min-h-screen px-5 py-12"><div className="mx-auto max-w-2xl">
    <p className="veramed-kicker">Kinesioterapia · $3.990</p>
    <h1 className="veramed-display mt-3 text-4xl">Solicita tu derivación</h1>
    <p className="mt-4 text-slate-600">Este flujo es para personas que ya tienen un diagnóstico documentado. Un médico revisa el antecedente antes de emitir.</p>
    <section className="veramed-panel mt-8 p-6 md:p-8">
      {!hasDiagnosis && <><h2 className="text-xl font-semibold">¿Ya tienes un diagnóstico para el problema que quieres tratar con kinesioterapia?</h2><div className="mt-6 grid gap-3 sm:grid-cols-2"><button className="veramed-primary-button px-5 py-4" onClick={() => setHasDiagnosis("yes")}>Sí</button><button className="veramed-secondary-button px-5 py-4" onClick={() => setHasDiagnosis("no")}>No</button></div></>}
      {hasDiagnosis === "no" && <div><h2 className="text-xl font-semibold">Para emitir una derivación online necesitamos conocer primero qué está causando tus síntomas.</h2><Link className="veramed-primary-button mt-6 px-5 py-3" href="/sintomas">Evaluar mis síntomas</Link></div>}
      {hasDiagnosis === "yes" && !result && <div><h2 className="text-xl font-semibold">Sube el documento donde aparece tu diagnóstico.</h2><p className="mt-2 text-sm text-slate-600">Certificado, orden, epicrisis, informe operatorio o informe escrito de imagen. PDF, JPG o PNG, máximo 10 MB.</p><input className="mt-5 block w-full rounded-2xl border border-slate-300 bg-white p-3" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /><button disabled={loading} className="veramed-primary-button mt-5 px-5 py-3 disabled:opacity-50" onClick={submit}>{loading ? "Revisando…" : "Revisar antecedente"}</button>{error && <p className="mt-4 text-sm text-red-700">{error}</p>}</div>}
      {result?.outcome === "eligible" && <div><h2 className="text-xl font-semibold text-emerald-800">Tu antecedente es compatible con una derivación online a kinesioterapia.</h2><p className="mt-3 text-slate-600">La orden se emitirá mediante validación automática del protocolo.</p><NewServiceCheckout orderId={result.id} baseAmount={3990} onError={setError}/>{error && <p className="mt-3 text-sm text-red-700">{error}</p>}</div>}
      {result && result.outcome !== "eligible" && <div><h2 className="text-xl font-semibold">Necesitamos revisión adicional del antecedente.</h2><p className="mt-3 text-slate-600">No te cobraremos por esta evaluación. Puedes solicitar una evaluación médica si quieres continuar.</p><Link className="veramed-primary-button mt-6 px-5 py-3" href="/telemedicina?source=kinesiology">Agendar telemedicina · $19.990</Link></div>}
    </section>
  </div></main>;
}
