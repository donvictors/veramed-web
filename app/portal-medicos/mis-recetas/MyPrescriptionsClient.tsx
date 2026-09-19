"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PortalIcon from "@/app/portal-medicos/_components/PortalIcon";
import { PageHeader } from "@/app/portal-medicos/_components/PortalUi";

type Prescription = {
  id: string;
  patientName: string;
  patientRut: string;
  verificationCode: string;
  status: "signed" | "sent" | "email_failed" | "revoked";
  signedAt: number;
  canDownload: boolean;
};

function statusLabel(status: Prescription["status"]) {
  if (status === "sent") return "Enviada";
  if (status === "email_failed") return "Firmada · correo pendiente";
  if (status === "revoked") return "Revocada";
  return "Firmada";
}

function statusClassName(status: Prescription["status"]) {
  if (status === "sent") return "bg-emerald-50 text-emerald-800";
  if (status === "email_failed") return "bg-amber-50 text-amber-800";
  if (status === "revoked") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

export default function MyPrescriptionsClient() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/portal-medicos/prescriptions", { cache: "no-store" });
        const payload = await response.json() as { prescriptions?: Prescription[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "No pudimos cargar tus recetas.");
        if (active) setPrescriptions(payload.prescriptions ?? []);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "No pudimos cargar tus recetas.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Medicamentos"
        title="Mis recetas"
        description="Consulta las recetas que has emitido desde el portal y abre sus documentos firmados."
        aside={<Link href="/portal-medicos/medicamentos/receta" className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"><PortalIcon name="pill" className="h-4 w-4" />Emitir receta</Link>}
      />

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-6">
        {loading ? <p className="text-sm text-slate-500">Cargando recetas...</p> : null}
        {error ? <p className="rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</p> : null}
        {!loading && !error && prescriptions.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Todavía no hay recetas emitidas.</p> : null}
        {!loading && !error && prescriptions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-3 py-3">Paciente</th><th className="px-3 py-3">Fecha</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Código</th><th className="px-3 py-3 text-right">PDF</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {prescriptions.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-4"><p className="font-semibold text-slate-900">{entry.patientName}</p><p className="text-xs text-slate-500">{entry.patientRut}</p></td>
                    <td className="px-3 py-4 text-slate-600">{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.signedAt))}</td>
                    <td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(entry.status)}`}>{statusLabel(entry.status)}</span></td>
                    <td className="px-3 py-4 font-mono text-xs text-slate-600">{entry.verificationCode}</td>
                    <td className="px-3 py-4 text-right">{entry.canDownload ? <a href={`/api/portal-medicos/prescriptions/${entry.id}/pdf`} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-800 hover:underline">Abrir</a> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
