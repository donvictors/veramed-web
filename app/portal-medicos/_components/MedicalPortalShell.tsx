"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import PortalIcon, { type PortalIconName } from "@/app/portal-medicos/_components/PortalIcon";

type Doctor = {
  name: string;
  email: string;
  role: "portal" | "doctor" | "admin";
  isPrimaryAdmin: boolean;
  specialty: string | null;
};

type NavChild = { label: string; href: string; external?: boolean };
type NavSection = { label: string; icon: PortalIconName; children: NavChild[] };

const sections: NavSection[] = [
  {
    label: "Medicamentos",
    icon: "pill",
    children: [
      { label: "Emitir receta", href: "/portal-medicos/medicamentos/receta" },
      { label: "Emitir receta magistral", href: "/portal-medicos/medicamentos/magistral" },
      { label: "Emitir receta cheque", href: "https://prescripcion-receta.minsal.cl/auth/login", external: true },
    ],
  },
  {
    label: "Indicaciones",
    icon: "syringe",
    children: [
      { label: "Exámenes", href: "/portal-medicos/indicaciones/examenes" },
      { label: "Vacunas", href: "/portal-medicos/indicaciones/vacunas" },
    ],
  },
  {
    label: "Derivaciones",
    icon: "referral",
    children: [
      { label: "Interconsultas", href: "/portal-medicos/derivaciones/interconsultas" },
    ],
  },
];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "VM";
}

export default function MedicalPortalShell({ doctor, children }: { doctor: Doctor; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(() =>
    sections.filter((section) => section.children.some((item) => pathname.startsWith(item.href))).map((section) => section.label),
  );
  const [loggingOut, setLoggingOut] = useState(false);

  function toggleSection(label: string) {
    setOpenSections((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/medicos-auth/logout", { method: "POST" });
    } finally {
      router.push("/medicos-login");
      router.refresh();
    }
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-white text-slate-800">
      <div className="border-b border-slate-200 px-4 py-4 lg:hidden">
        <div className="flex items-center justify-between">
          <BrandLogo />
          <button type="button" onClick={() => setMobileOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar menú">
            <PortalIcon name="x" />
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-5" aria-label="Módulos médicos">
        {sections.map((section) => {
          const open = openSections.includes(section.label);
          return (
            <div key={section.label}>
              <button
                type="button"
                onClick={() => toggleSection(section.label)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition hover:bg-emerald-50 hover:text-emerald-900"
              >
                <PortalIcon name={section.icon} className="h-5 w-5 shrink-0 text-emerald-700" />
                <span className="flex-1">{section.label}</span>
                <PortalIcon name="chevron" className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
              </button>
              {open ? (
                <div className="ml-6 mt-1 space-y-1 border-l border-slate-200 pl-3">
                  {section.children.map((item) => {
                    const active = !item.external && pathname === item.href;
                    const className = `flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${active ? "bg-emerald-100 font-semibold text-emerald-950" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`;
                    return item.external ? (
                      <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
                        {item.label}<PortalIcon name="external" className="h-4 w-4" />
                      </a>
                    ) : (
                      <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={className}>{item.label}</Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <button type="button" onClick={logout} disabled={loggingOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60">
          <PortalIcon name="logout" className="h-5 w-5" />
          {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f7f6] text-slate-900">
      <header className="relative z-40 border-b border-slate-200 bg-white">
        <div className="flex h-[72px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/portal-medicos" aria-label="Ir al escritorio del portal médico"><BrandLogo /></Link>
          <p className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 sm:block">Portal médico</p>
        </div>
      </header>

      <div className="relative z-30 flex min-h-[72px] items-stretch bg-emerald-700 text-white shadow-sm">
        <button type="button" onClick={() => setMobileOpen(true)} className="flex w-16 items-center justify-center border-r border-white/10 lg:hidden" aria-label="Abrir navegación">
          <PortalIcon name="menu" />
        </button>
        <div className="relative flex min-w-0 items-center border-r border-white/10 lg:w-[292px]">
          <button type="button" onClick={() => setProfileOpen((value) => !value)} className="flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left hover:bg-white/5" aria-expanded={profileOpen}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/12 text-sm font-bold">{initials(doctor.name)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{doctor.name}</span>
              <span className="block truncate text-[11px] uppercase tracking-[0.12em] text-emerald-100">{doctor.isPrimaryAdmin ? "Administrador principal" : doctor.specialty || "Especialidad no configurada"}</span>
            </span>
            <PortalIcon name="chevron" className={`h-4 w-4 shrink-0 transition ${profileOpen ? "rotate-180" : ""}`} />
          </button>
          {profileOpen ? (
            <div className="absolute left-3 top-[calc(100%+8px)] z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl">
              <div className="border-b border-slate-100 px-3 py-3">
                <p className="truncate text-sm font-semibold">{doctor.name}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{doctor.email}</p>
              </div>
              <Link href="/portal-medicos/perfil" onClick={() => setProfileOpen(false)} className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-emerald-50 hover:text-emerald-900">
                <PortalIcon name="user" className="h-4 w-4" />Editar perfil
              </Link>
            </div>
          ) : null}
        </div>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto px-2 sm:px-4" aria-label="Navegación principal médica">
          <TopLink href="/portal-medicos" label="Escritorio" icon="home" active={pathname === "/portal-medicos"} />
          {doctor.role !== "portal" ? (
            <TopLink href="/portal-medicos/validar-ordenes" label="Validar órdenes" icon="document" active={pathname.startsWith("/portal-medicos/validar-ordenes") || pathname.startsWith("/portal-medicos/orden/")} />
          ) : null}
          {doctor.role === "admin" ? (
            <TopLink href="/portal-medicos/boletas" label="Boletas" icon="receipt" active={pathname.startsWith("/portal-medicos/boletas")} />
          ) : null}
          {doctor.role === "admin" ? (
            <TopLink href="/portal-medicos/blog" label="Blog" icon="blog" active={pathname.startsWith("/portal-medicos/blog")} />
          ) : null}
          {doctor.role === "admin" ? (
            <TopLink href="/portal-medicos/administrar-usuarios" label="Administrar usuarios" icon="users" active={pathname.startsWith("/portal-medicos/administrar-usuarios")} />
          ) : null}
        </nav>
      </div>

      <div className="flex min-h-[calc(100vh-144px)]">
        <aside className={`${collapsed ? "lg:w-0 lg:overflow-hidden" : "lg:w-[292px]"} hidden shrink-0 border-r border-slate-200 bg-white transition-[width] lg:block`}>
          {sidebar}
        </aside>
        <div className="relative min-w-0 flex-1">
          <button type="button" onClick={() => setCollapsed((value) => !value)} className="absolute left-3 top-3 z-20 hidden rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm hover:text-emerald-800 lg:inline-flex" aria-label={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}>
            <PortalIcon name="chevron" className={`h-4 w-4 ${collapsed ? "-rotate-90" : "rotate-90"}`} />
          </button>
          <main className="mx-auto w-full max-w-[1480px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Cerrar navegación" />
          <aside className="relative h-full w-[min(88vw,320px)] shadow-2xl">{sidebar}</aside>
        </div>
      ) : null}
    </div>
  );
}

function TopLink({ href, label, icon, active }: { href: string; label: string; icon: PortalIconName; active: boolean }) {
  return (
    <Link href={href} aria-label={label} title={label} aria-current={active ? "page" : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-white text-emerald-950 shadow-sm" : "text-emerald-50 hover:bg-white/10"}`}>
      <PortalIcon name={icon} className="h-5 w-5" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
