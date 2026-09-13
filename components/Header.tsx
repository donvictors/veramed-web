"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import BrandLogo from "./BrandLogo";

const navItems = [
  { label: "Servicios", href: "/#servicios" },
  { label: "Cómo funciona", href: "/#como-funciona" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Pacientes", href: "/pacientes" },
  { label: "Blog", href: "/blog" },
];

const COMPACT_FLOW_PREFIXES = ["/chequeo", "/control-cronico", "/sintomas"];

type HeaderSession = {
  kind: "patient" | "medical";
  name: string;
  shortName: string;
  email: string;
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<HeaderSession | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/auth/header-session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudo consultar la sesión.");
        return response.json() as Promise<{
          authenticated: boolean;
          session: HeaderSession | null;
        }>;
      })
      .then((response) => {
        if (!cancelled) setSession(response.authenticated ? response.session : null);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function handleLogout() {
    if (!session) return;

    const endpoint = session.kind === "medical" ? "/api/medicos-auth/logout" : "/api/auth/logout";
    try {
      await fetch(endpoint, { method: "POST" });
    } finally {
      setSession(null);
      router.push("/");
      router.refresh();
    }
  }

  const isCompactFlowHeader = useMemo(() => {
    if (!pathname) return false;
    return COMPACT_FLOW_PREFIXES.some((prefix) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  }, [pathname]);

  if (pathname === "/portal-medicos" || pathname.startsWith("/portal-medicos/")) {
    return null;
  }

  if (isCompactFlowHeader) {
    return (
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 shadow-[0_12px_34px_-30px_rgba(15,23,42,0.5)] backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3.5">
          <Link href="/" className="shrink-0" aria-label="Ir al inicio de Veramed">
            <BrandLogo priority />
          </Link>
          {session ? (
            <UserSessionMenu session={session} onLogout={handleLogout} />
          ) : session === undefined ? (
            <div
              className="h-11 w-36 animate-pulse rounded-2xl bg-slate-100"
              aria-label="Consultando sesión"
            />
          ) : null}
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 shadow-[0_12px_34px_-30px_rgba(15,23,42,0.5)] backdrop-blur-xl print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-6 py-3.5">
        <Link href="/" className="shrink-0" aria-label="Ir al inicio de Veramed">
          <BrandLogo priority />
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50/80 p-1 text-sm font-medium text-slate-600 xl:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "rounded-full px-3.5 py-2 transition hover:bg-white hover:text-slate-950",
                pathname === item.href ? "bg-white text-emerald-800 shadow-sm" : "",
              ].join(" ")}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {session ? (
          <UserSessionMenu session={session} onLogout={handleLogout} />
        ) : session === undefined ? (
          <div
            className="h-11 w-36 animate-pulse rounded-2xl bg-slate-100"
            aria-label="Consultando sesión"
          />
        ) : (
        <div className="flex items-center gap-2">
          <details className="group relative hidden xl:block">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-emerald-300 hover:text-emerald-800">
              Cuenta Paciente
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="transition-transform group-open:rotate-180"
              >
                <path
                  d="m7 10 5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </summary>
            <div className="absolute right-0 top-12 z-40 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
              <Link
                href="/ingresar"
                className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/crear-cuenta"
                className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800"
              >
                Crear cuenta
              </Link>
            </div>
          </details>
          <Link
            href="/medicos-login"
            className="hidden rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-emerald-300 hover:text-emerald-800 xl:inline-flex"
          >
            Portal Médicos
          </Link>
          <details className="group relative xl:hidden">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:border-slate-400">
              <span className="sr-only">Abrir menú</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </summary>
            <div className="absolute right-0 top-12 z-40 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800"
                >
                  {item.label}
                </Link>
              ))}
              <div className="my-2 border-t border-slate-200" />
              <p className="px-4 pb-1 pt-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                Cuenta Paciente
              </p>
              <Link
                href="/ingresar"
                className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/crear-cuenta"
                className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
              >
                Crear cuenta
              </Link>
              <Link
                href="/medicos-login"
                className="mt-1 block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
              >
                Portal Médicos
              </Link>
            </div>
          </details>
          <Link
            href="/#servicios"
            className="rounded-2xl border border-emerald-400 bg-white px-3 py-2.5 text-xs font-semibold text-emerald-800 shadow-[0_0_0_3px_rgba(52,211,153,0.22),0_12px_24px_-16px_rgba(5,150,105,0.9)] transition hover:-translate-y-0.5 hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-[0_0_0_4px_rgba(52,211,153,0.28),0_14px_28px_-16px_rgba(5,150,105,0.95)] sm:px-4 sm:text-sm"
          >
            Quiero mi orden
          </Link>
        </div>
        )}
      </div>
    </header>
  );
}

function UserSessionMenu({
  session,
  onLogout,
}: {
  session: HeaderSession;
  onLogout: () => Promise<void>;
}) {
  const accountHref = session.kind === "medical" ? "/portal-medicos" : "/mi-cuenta";
  const accountLabel = session.kind === "medical" ? "Ir al escritorio" : "Ir a Mi cuenta";

  return (
    <details className="group relative">
      <summary
        className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-2xl border border-emerald-300 bg-white py-1.5 pl-1.5 pr-3 text-sm font-semibold text-slate-900 shadow-[0_8px_24px_-18px_rgba(5,150,105,0.8)] transition hover:border-emerald-500 hover:text-emerald-800 [&::-webkit-details-marker]:hidden"
        aria-label={`Abrir menú de ${session.name}`}
      >
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50">
          <Image
            src="/brand/veramed-icon.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 object-cover"
          />
        </span>
        <span className="max-w-32 truncate sm:max-w-44">{session.shortName}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="shrink-0 transition-transform group-open:rotate-180"
        >
          <path
            d="m7 10 5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <div className="absolute right-0 top-12 z-40 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
        <div className="px-3 py-2">
          <p className="truncate text-sm font-semibold text-slate-900">{session.name}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{session.email}</p>
        </div>
        <div className="my-1 border-t border-slate-200" />
        <Link
          href={accountHref}
          className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800"
        >
          {accountLabel}
        </Link>
        <button
          type="button"
          onClick={() => void onLogout()}
          className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-rose-50 hover:text-rose-700"
        >
          Cerrar sesión
        </button>
      </div>
    </details>
  );
}
