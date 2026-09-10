"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import BrandLogo from "./BrandLogo";

const navItems = [
  { label: "Servicios", href: "/#servicios" },
  { label: "Cómo funciona", href: "/#como-funciona" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Pacientes", href: "/pacientes" },
  { label: "Blog", href: "/blog" },
];

const COMPACT_FLOW_PREFIXES = ["/chequeo", "/control-cronico", "/sintomas"];

export default function Header() {
  const pathname = usePathname();

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
          <span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Entorno clínico seguro
          </span>
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
      </div>
    </header>
  );
}
