"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "./BrandLogo";

export default function Footer() {
  const pathname = usePathname();

  if (pathname === "/portal-medicos" || pathname.startsWith("/portal-medicos/")) {
    return null;
  }

  return (
    <footer className="border-t border-white/10 bg-slate-950 text-white print:hidden">
      <div className="mx-auto max-w-6xl px-6 py-8 md:py-10">
        <div className="grid gap-7 border-b border-white/10 pb-7 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div className="max-w-md">
            <BrandLogo tone="light" />
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Órdenes médicas pensadas con criterio clínico, evidencia y una experiencia digital
              clara de principio a fin.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Explora
            </p>
            <div className="mt-3 grid gap-2 text-sm font-medium text-slate-300">
              <Link href="/nosotros" className="transition hover:text-white">
                Nosotros
              </Link>
              <Link href="/blog" className="transition hover:text-white">
                Blog
              </Link>
              <Link href="/pacientes" className="transition hover:text-white">
                Pacientes
              </Link>
              <Link href="/contacto" className="transition hover:text-white">
                Contacto
              </Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Información
            </p>
            <div className="mt-3 grid gap-2 text-sm font-medium text-slate-300">
              <Link href="/medicos-login" className="transition hover:text-white">
                Portal médico
              </Link>
              <Link href="/terminos" className="transition hover:text-white">
                Términos
              </Link>
              <Link href="/privacidad" className="transition hover:text-white">
                Privacidad
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-6 text-slate-400">
            © {new Date().getFullYear()} Veramed, Vitaremu SpA 🌱. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-3">
            <a
              href="https://www.instagram.com/veramed.cl"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram de Veramed"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-slate-300 transition hover:border-emerald-400/50 hover:bg-emerald-400/10 hover:text-emerald-300"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="17.4" cy="6.6" r="1.2" fill="currentColor" />
              </svg>
            </a>
            <a
              href="https://www.facebook.com/share/18AP1NXbjN/?mibextid=wwXIfr"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook de Veramed"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-slate-300 transition hover:border-emerald-400/50 hover:bg-emerald-400/10 hover:text-emerald-300"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M13.6 21v-7h2.6l.5-3h-3.1V9.2c0-.9.4-1.6 1.8-1.6H17V4.9c-.3 0-1.2-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2V11H8v3h2.5v7h3.1Z"
                  fill="currentColor"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
