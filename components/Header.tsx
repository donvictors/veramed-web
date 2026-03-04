import { cookies } from "next/headers";
import Link from "next/link";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";
import BrandLogo from "./BrandLogo";

const navItems = [
  { label: "Servicios", href: "#servicios" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Confianza", href: "#confianza" },
  { label: "FAQ", href: "#faq" },
];

export default async function Header() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  const user = await getUserFromSession(token);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="shrink-0" aria-label="Ir al inicio de Veramed">
          <BrandLogo className="h-16 w-auto md:h-20" priority />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-slate-950">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Link
              href="/mi-cuenta"
              className="hidden rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-400 md:inline-flex"
            >
              Mi cuenta
            </Link>
          ) : (
            <>
              <Link
                href="/ingresar"
                className="hidden rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-400 md:inline-flex"
              >
                Ingresar
              </Link>
              <Link
                href="/crear-cuenta"
                className="hidden rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-400 md:inline-flex"
              >
                Crear cuenta
              </Link>
            </>
          )}
          <Link
            href="#servicios"
            className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            ¡Quiero mi orden!
          </Link>
        </div>
      </div>
    </header>
  );
}
