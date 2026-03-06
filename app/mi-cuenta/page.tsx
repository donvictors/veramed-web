"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { fetchAccountOverview, logoutCurrentUser } from "@/lib/auth-api";
import { sendOrderReadyEmail } from "@/lib/email-api";
import { type AuthUser } from "@/lib/auth";
import { calculateAgeFromBirthDate, formatRut, normalizeRut } from "@/lib/checkup";

type HistoryItem = {
  id: string;
  kind: "chequeo" | "control_cronico";
  title: string;
  patientName: string;
  patientEmail: string;
  createdAt: number;
  updatedAt: number;
  status: "queued" | "approved" | "rejected";
  paid: boolean;
  folio: string;
  href?: string;
  paymentHref?: string;
  reviewHref?: string;
};

type UiStatus = "pending_payment" | "in_review" | "ready" | "rejected";
type DashboardFilter = "all" | "active" | "pending_payment" | "ready";
type ListTab = "active" | "ready" | "all";

const primaryBtnCls =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800";
const secondaryBtnCls =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50";

export default function AccountPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DashboardFilter>("all");
  const [tab, setTab] = useState<ListTab>("all");
  const [notice, setNotice] = useState("");
  const [resendLoadingById, setResendLoadingById] = useState<Record<string, boolean>>({});
  const [avatarSrc, setAvatarSrc] = useState("/brand/profile-avatar.png");

  useEffect(() => {
    void fetchAccountOverview()
      .then((response) => {
        setUser(response.user);
        setHistory(response.history as HistoryItem[]);
      })
      .catch(() => {
        window.location.href = "/ingresar";
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      const priorityA = getStatusPriority(toUiStatus(a));
      const priorityB = getStatusPriority(toUiStatus(b));
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return b.updatedAt - a.updatedAt;
    });
  }, [history]);

  const activeCount = useMemo(
    () => sortedHistory.filter((item) => isActiveStatus(toUiStatus(item))).length,
    [sortedHistory],
  );
  const pendingCount = useMemo(
    () => sortedHistory.filter((item) => toUiStatus(item) === "pending_payment").length,
    [sortedHistory],
  );
  const readyCount = useMemo(
    () => sortedHistory.filter((item) => toUiStatus(item) === "ready").length,
    [sortedHistory],
  );

  const effectiveFilter: DashboardFilter = filter !== "all" ? filter : tabToFilter(tab);
  const filteredHistory = useMemo(
    () => sortedHistory.filter((item) => matchesFilter(item, effectiveFilter)),
    [effectiveFilter, sortedHistory],
  );

  async function handleLogout() {
    await logoutCurrentUser();
    window.location.href = "/ingresar";
  }

  async function handleResendEmail(item: HistoryItem) {
    if (resendLoadingById[item.id]) return;

    try {
      setResendLoadingById((current) => ({ ...current, [item.id]: true }));
      setNotice("");

      await sendOrderReadyEmail({
        requestType: item.kind === "chequeo" ? "checkup" : "chronic_control",
        requestId: item.id,
        email: item.patientEmail || user?.email || "",
        patientName: item.patientName,
        orderLink: `${window.location.origin}${item.href}`,
        forceResend: true,
      });

      setNotice("Correo reenviado correctamente.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No pudimos reenviar el correo.");
    } finally {
      setResendLoadingById((current) => ({ ...current, [item.id]: false }));
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-5xl px-6 py-10 md:py-12">
          <HistorySkeleton />
        </div>
      </main>
    );
  }

  if (!user) return null;

  const formattedRut = formatPatientRut(user.profile.rut);
  const formattedBirthDate = formatBirthDate(user.profile.birthDate);
  const age = calculateAgeFromBirthDate(user.profile.birthDate);
  const formattedPhone = formatPhone(user.profile.phone);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-10 md:py-12">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src={avatarSrc}
                alt="Foto de perfil"
                width={68}
                height={68}
                priority
                onError={() => {
                  if (avatarSrc !== "/brand/veramed-icon.png") {
                    setAvatarSrc("/brand/veramed-icon.png");
                  }
                }}
                className="h-16 w-16 rounded-full border border-slate-200 bg-white object-cover"
              />
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Mi cuenta</h1>
                <p className="mt-1 text-sm text-slate-500">Hola, {user.name}</p>
              </div>
            </div>
            <Link href="/chequeo" className={primaryBtnCls}>
              Solicitar orden
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <FilterChip
              label="Órdenes activas"
              value={activeCount}
              active={effectiveFilter === "active"}
              onClick={() => {
                setFilter("active");
                setTab("active");
              }}
            />
            <FilterChip
              label="Pendientes de pago"
              value={pendingCount}
              active={effectiveFilter === "pending_payment"}
              onClick={() => {
                setFilter("pending_payment");
                setTab("all");
              }}
            />
            <FilterChip
              label="Listas para descargar"
              value={readyCount}
              active={effectiveFilter === "ready"}
              onClick={() => {
                setFilter("ready");
                setTab("ready");
              }}
            />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Datos personales</p>
              <div className="flex items-center gap-2">
                <Link href="/mi-cuenta/datos" className={secondaryBtnCls}>
                  Editar datos
                </Link>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <InfoRow label="Nombre" value={user.profile.fullName || user.name} />
              <InfoRow
                label="RUT"
                value={formattedRut}
              />
              <InfoRow label="Fecha de nacimiento" value={formattedBirthDate} />
              <InfoRow label="Edad" value={age > 0 ? `${age} años` : "No calculable"} />
              <InfoRow
                label="Correo"
                value={user.profile.email || user.email}
              />
              <InfoRow label="Teléfono" value={formattedPhone || "No informado"} />
              <InfoRow
                label="Dirección"
                value={user.profile.address || "No informada"}
                className="md:col-span-2"
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Historial
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Mis solicitudes</h2>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>
                  <span className="font-semibold text-slate-700">Soporte:</span>{" "}
                  <a className="underline" href="mailto:contacto@mail.veramed.cl">
                    contacto@mail.veramed.cl
                  </a>
                </p>
              </div>
            </div>

            <div className="mt-4 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <TabButton
                active={tab === "active"}
                onClick={() => {
                  setTab("active");
                  setFilter("all");
                }}
                label="Activas"
              />
              <TabButton
                active={tab === "ready"}
                onClick={() => {
                  setTab("ready");
                  setFilter("all");
                }}
                label="Listas"
              />
              <TabButton
                active={tab === "all"}
                onClick={() => {
                  setTab("all");
                  setFilter("all");
                }}
                label="Todas"
              />
            </div>

            {notice && (
              <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {notice}
              </p>
            )}

            {filteredHistory.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="mt-4 grid gap-3">
                {filteredHistory.map((item) => {
                  const uiStatus = toUiStatus(item);
                  const primaryAction = getPrimaryAction(item, uiStatus);
                  const detailHref = getOrderHref(item);
                  const orderHref = getOrderHref(item);

                  return (
                    <article
                      key={`${item.kind}-${item.id}`}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          <p className="text-sm text-slate-600">{item.patientName}</p>
                        </div>
                        <StatusBadge status={uiStatus} />
                      </div>

                      <div className="mt-2 grid gap-1 text-xs text-slate-500">
                        <p>
                          {formatRelativeTime(item.createdAt)} ·{" "}
                          {formatDateTime(item.createdAt)}
                        </p>
                        <p>
                          Folio: <span className="font-semibold text-slate-700">{item.folio}</span>
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Link href={primaryAction.href} className={primaryBtnCls}>
                          {primaryAction.label}
                        </Link>
                        <Link href={detailHref} className={secondaryBtnCls}>
                          Detalles
                        </Link>

                        <details className="relative ml-auto">
                          <summary
                            className={`${secondaryBtnCls} cursor-pointer list-none px-3 text-base leading-none`}
                            aria-label="Más acciones"
                          >
                            ⋯
                          </summary>
                          <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                            <button
                              onClick={() => handleResendEmail(item)}
                              disabled={resendLoadingById[item.id]}
                              className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
                            >
                              {resendLoadingById[item.id] ? "Reenviando..." : "Reenviar email"}
                            </button>
                            <Link
                              href={orderHref}
                              className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                              Descargar / Ver orden
                            </Link>
                            <a
                              href="mailto:contacto@mail.veramed.cl?subject=Soporte%20Veramed"
                              className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                              Soporte
                            </a>
                            <button
                              disabled
                              className="w-full cursor-not-allowed rounded-lg px-3 py-2 text-left text-sm text-slate-400"
                            >
                              Cancelar (próximamente)
                            </button>
                          </div>
                        </details>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <p className="mt-4 text-xs text-slate-500">
              Tus datos están protegidos. Revisa nuestra{" "}
              <Link href="/privacidad" className="font-semibold underline">
                política de privacidad
              </Link>
              .
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href="/" className={secondaryBtnCls}>
              Volver al inicio
            </Link>
            <button onClick={handleLogout} className={primaryBtnCls}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function FilterChip({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border px-4 py-3 text-left transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
      }`}
    >
      <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${active ? "text-slate-200" : "text-slate-500"}`}>
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </button>
  );
}

function InfoRow({
  label,
  value,
  action,
  className = "",
}: {
  label: string;
  value: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white px-3 py-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
        {action}
      </div>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: UiStatus }) {
  const tone =
    status === "pending_payment"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : status === "in_review"
        ? "bg-sky-50 text-sky-800 border-sky-200"
        : status === "ready"
          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
          : "bg-rose-50 text-rose-800 border-rose-200";
  const icon =
    status === "pending_payment" ? "⏳" : status === "in_review" ? "🩺" : status === "ready" ? "✔" : "✖";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
      <span aria-hidden>{icon}</span>
      {statusLabel(status)}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
      <p className="text-sm text-slate-600">Aún no tienes solicitudes.</p>
      <Link href="/chequeo" className={`${primaryBtnCls} mt-3`}>
        Nuevo chequeo
      </Link>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
      <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
      <div className="mt-2 h-4 w-56 animate-pulse rounded bg-slate-200" />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="h-20 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="mt-6 grid gap-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-28 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    </section>
  );
}

function toUiStatus(item: HistoryItem): UiStatus {
  if (item.status === "rejected") return "rejected";
  if (!item.paid) return "pending_payment";
  if (item.status === "approved") return "ready";
  return "in_review";
}

function isActiveStatus(status: UiStatus) {
  return status === "pending_payment" || status === "in_review";
}

function tabToFilter(tab: ListTab): DashboardFilter {
  if (tab === "active") return "active";
  if (tab === "ready") return "ready";
  return "all";
}

function matchesFilter(item: HistoryItem, filter: DashboardFilter) {
  const status = toUiStatus(item);

  if (filter === "all") return true;
  if (filter === "active") return isActiveStatus(status);
  if (filter === "pending_payment") return status === "pending_payment";
  return status === "ready";
}

function getStatusPriority(status: UiStatus) {
  if (status === "pending_payment") return 0;
  if (status === "in_review") return 1;
  if (status === "ready") return 2;
  return 3;
}

function statusLabel(status: UiStatus) {
  if (status === "pending_payment") return "Pendiente de pago";
  if (status === "in_review") return "En revisión médica";
  if (status === "ready") return "Lista para descargar";
  return "Rechazada";
}

function formatDateTime(value: number) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeTime(value: number) {
  const now = Date.now();
  const diffMs = value - now;
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const rtf = new Intl.RelativeTimeFormat("es-CL", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, "day");

  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, "month");

  const diffYears = Math.round(diffMonths / 12);
  return rtf.format(diffYears, "year");
}

function formatPatientRut(rawValue: string) {
  if (!rawValue) return "No informado";
  const normalized = normalizeRut(rawValue);
  return normalized ? formatRut(normalized) : rawValue;
}

function formatPhone(rawValue: string) {
  const digits = rawValue.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length === 11 && digits.startsWith("56")) {
    return `+56 ${digits.slice(2, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }

  if (digits.length === 9) {
    return `+56 ${digits.slice(0, 1)} ${digits.slice(1, 5)} ${digits.slice(5)}`;
  }

  return rawValue;
}

function formatBirthDate(rawValue: string) {
  if (!rawValue) return "No informada";
  const date = new Date(`${rawValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return rawValue;

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
  }).format(date);
}

function getPrimaryAction(item: HistoryItem, status: UiStatus) {
  if (status === "pending_payment") {
    return {
      label: "Pagar",
      href: getPaymentHref(item),
    };
  }

  if (status === "in_review") {
    return {
      label: "Ver estado",
      href: getReviewHref(item),
    };
  }

  if (status === "ready") {
    return {
      label: "Descargar PDF",
      href: getOrderHref(item),
    };
  }

  return {
    label: "Solicitar nuevamente",
    href: item.kind === "chequeo" ? "/chequeo" : "/control-cronico",
  };
}

function getBasePath(kind: HistoryItem["kind"]) {
  return kind === "chequeo" ? "/chequeo" : "/control-cronico";
}

function getOrderHref(item: HistoryItem) {
  return item.href || `${getBasePath(item.kind)}/orden?id=${item.id}`;
}

function getPaymentHref(item: HistoryItem) {
  return item.paymentHref || `${getBasePath(item.kind)}/pago?id=${item.id}`;
}

function getReviewHref(item: HistoryItem) {
  return item.reviewHref || `${getBasePath(item.kind)}/estado?id=${item.id}`;
}
