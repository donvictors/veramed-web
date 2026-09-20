"use client";

import { useState, type FormEvent } from "react";

type VerificationResult = {
  found: boolean;
  valid: boolean;
  code: string;
  documentType?: "Receta médica";
  status?: "Vigente" | "Revocada";
  issuedAt?: string;
  prescriberName?: string;
  prescriberSpecialty?: string;
  itemCount?: number;
};

function formatIssuedAt(value?: string) {
  if (!value) return "No disponible";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "long" }).format(new Date(value));
}

export default function OrderVerificationForm() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/orders/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (VerificationResult & { error?: string })
        | null;

      if (!response.ok || !payload) {
        throw new Error(payload?.error || "No pudimos verificar el código.");
      }
      setResult(payload);
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "No pudimos verificar el código.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="veramed-panel p-6 md:p-8">
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label htmlFor="verification-code" className="text-sm font-semibold text-slate-900">
          Código de la receta
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="verification-code"
            name="verification-code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase());
              setResult(null);
              setError("");
            }}
            placeholder="Ej: RX-20260913-ABC123"
            autoComplete="off"
            spellCheck={false}
            required
            maxLength={80}
            className="min-h-12 min-w-0 flex-1 rounded-2xl border border-slate-300 bg-white px-4 font-mono text-sm uppercase text-slate-950 outline-none transition placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="min-h-12 rounded-2xl bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Verificando…" : "Verificar orden"}
          </button>
        </div>
      </form>

      <div aria-live="polite" className="mt-6">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {result && !result.found ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="font-semibold text-amber-950">No encontramos una receta con ese código.</p>
            <p className="mt-2 text-sm leading-6 text-amber-800">
              Revisa que lo hayas escrito completo, incluyendo guiones, e intenta nuevamente.
            </p>
          </div>
        ) : null}

        {result?.found ? (
          <div
            className={`rounded-2xl border p-5 ${
              result.valid
                ? "border-emerald-200 bg-emerald-50"
                : "border-rose-200 bg-rose-50"
            }`}
          >
            <p
              className={`text-lg font-semibold ${
                result.valid ? "text-emerald-950" : "text-rose-950"
              }`}
            >
              {result.valid ? "Orden válida" : "Orden revocada"}
            </p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <ResultDetail label="Documento" value={result.documentType || "Receta médica"} />
              <ResultDetail label="Estado" value={result.status || "No disponible"} />
              <ResultDetail label="Fecha de emisión" value={formatIssuedAt(result.issuedAt)} />
              <ResultDetail
                label="Profesional"
                value={
                  [result.prescriberName, result.prescriberSpecialty].filter(Boolean).join(" · ") ||
                  "No disponible"
                }
              />
              <ResultDetail
                label="Indicaciones"
                value={`${result.itemCount ?? 0} medicamento${result.itemCount === 1 ? "" : "s"}`}
              />
              <ResultDetail label="Código" value={result.code} mono />
            </dl>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResultDetail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className={`mt-1 font-semibold text-slate-900 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
