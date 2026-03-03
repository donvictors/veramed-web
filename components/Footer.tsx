import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-slate-900">
            Veramed | Órdenes médicas basadas en evidencia
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            © {new Date().getFullYear()} Veramed, Vitaremu SpA.
          </p>
        </div>

        <div className="flex flex-wrap gap-5 text-sm font-medium text-slate-600">
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
      </div>
    </footer>
  );
}
