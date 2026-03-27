import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-slate-900">
            Veramed | Órdenes médicas basadas en evidencia
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            © {new Date().getFullYear()} Veramed, Vitaremu SpA. 🌱
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-sm font-medium text-slate-600">
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/nosotros" className="transition hover:text-slate-950">
              Nosotros
            </Link>
            <Link href="/blog" className="transition hover:text-slate-950">
              Blog
            </Link>
            <Link href="/pacientes" className="transition hover:text-slate-950">
              Pacientes
            </Link>
            <Link href="/medicos-login" className="transition hover:text-slate-950">
              Médicos
            </Link>
            <Link href="/terminos" className="transition hover:text-slate-950">
              Términos
            </Link>
            <Link href="/privacidad" className="transition hover:text-slate-950">
              Privacidad
            </Link>
            <Link href="/contacto" className="transition hover:text-slate-950">
              Contacto
            </Link>
          </div>

          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <a
              href="https://www.instagram.com/veramed.cl"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram de Veramed"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="17.4" cy="6.6" r="1.2" fill="currentColor" />
              </svg>
            </a>
            <a
              href="https://www.facebook.com/share/18AP1NXbjN/?mibextid=wwXIfr"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook de Veramed"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
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
