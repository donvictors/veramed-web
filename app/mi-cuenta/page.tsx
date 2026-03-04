"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAccountOverview, logoutCurrentUser } from "@/lib/auth-api";
import { type AuthUser } from "@/lib/auth";

type HistoryItem = {
  id: string;
  kind: "chequeo" | "control_cronico";
  title: string;
  patientName: string;
  createdAt: number;
  updatedAt: number;
  status: "queued" | "approved" | "rejected";
  paid: boolean;
  href: string;
  reviewHref: string;
};

export default function AccountPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchAccountOverview()
      .then((response) => {
        setUser(response.user);
        setHistory(response.history);
      })
      .catch(() => {
        window.location.href = "/ingresar";
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleLogout() {
    await logoutCurrentUser();
    window.location.href = "/ingresar";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <p className="text-sm text-slate-600">Cargando tu cuenta...</p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Cuenta Veramed
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Hola, {user.name}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Esta es tu sesión activa. Desde aquí puedes mantener una cuenta persistente para tus
            solicitudes dentro de Veramed.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <InfoCard label="Nombre" value={user.name} />
            <InfoCard label="Correo" value={user.email} />
            <InfoCard label="RUT" value={user.profile.rut || "No informado"} />
            <InfoCard label="Teléfono" value={user.profile.phone || "No informado"} />
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Historial real
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">
                  Solicitudes y órdenes
                </h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {history.length} registro{history.length === 1 ? "" : "s"}
              </span>
            </div>

            {history.length === 0 ? (
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Aún no tienes solicitudes asociadas a tu cuenta.
              </p>
            ) : (
              <div className="mt-5 grid gap-3">
                {history.map((item) => (
                  <div
                    key={`${item.kind}-${item.id}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.patientName}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {formatStatus(item.status)}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Creada: {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Pago: {item.paid ? "Confirmado" : "Pendiente"}
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <Link
                        href={item.reviewHref}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-900"
                      >
                        Ver estado
                      </Link>
                      <Link
                        href={item.href}
                        className="rounded-2xl bg-slate-950 px-4 py-2 text-center text-sm font-semibold text-white"
                      >
                        Ver orden
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-900"
            >
              Volver al inicio
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function formatStatus(status: "queued" | "approved" | "rejected") {
  if (status === "queued") return "En revisión";
  if (status === "approved") return "Aprobada";
  return "Rechazada";
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
