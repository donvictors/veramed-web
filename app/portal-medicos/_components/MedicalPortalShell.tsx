"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import PortalIcon, { type PortalIconName } from "@/app/portal-medicos/_components/PortalIcon";
import { medicalPortalInitials } from "@/lib/medical-portal/profile";

type Doctor = { name:string; firstName:string; paternalSurname:string; maternalSurname:string; email:string; role:"portal"|"doctor"|"admin"; isPrimaryAdmin:boolean; specialty:string|null };
type MenuItem = { label:string; href:string; icon:PortalIconName };
type ClinicalSection = { label:string; icon:PortalIconName; items:Array<{label:string;href:string;external?:boolean}> };
const clinicalSections: ClinicalSection[] = [
  { label:"Medicamentos", icon:"pill", items:[{label:"Emitir receta",href:"/portal-medicos/medicamentos/receta"},{label:"Emitir receta magistral",href:"/portal-medicos/medicamentos/magistral"},{label:"Emitir receta cheque",href:"https://prescripcion-receta.minsal.cl/auth/login",external:true}] },
  { label:"Indicaciones", icon:"syringe", items:[{label:"Exámenes",href:"/portal-medicos/indicaciones/examenes"},{label:"Vacunas",href:"/portal-medicos/indicaciones/vacunas"}] },
  { label:"Derivaciones", icon:"referral", items:[{label:"Interconsultas",href:"/portal-medicos/derivaciones/interconsultas"}] },
];
const validationItems: MenuItem[] = [
  { label:"Validar órdenes", href:"/portal-medicos/validar-ordenes", icon:"document" },
  { label:"Revisar validación automática", href:"/portal-medicos/ordenes-automaticas", icon:"document" },
];
const administrationItems: MenuItem[] = [
  { label:"Boletas", href:"/portal-medicos/boletas", icon:"receipt" },
  { label:"Campañas", href:"/portal-medicos/descuentos", icon:"document" },
  { label:"Blog", href:"/portal-medicos/blog", icon:"blog" },
  { label:"Administrar usuarios", href:"/portal-medicos/administrar-usuarios", icon:"users" },
];

export default function MedicalPortalShell({doctor,children}:{doctor:Doctor;children:React.ReactNode}){
  const pathname=usePathname(); const router=useRouter(); const headerRef=useRef<HTMLElement>(null);
  const [open,setOpen]=useState<"profile"|"validation"|"administration"|null>(null); const [loggingOut,setLoggingOut]=useState(false);
  const [openClinical,setOpenClinical]=useState<string[]>(()=>clinicalSections.filter(section=>section.items.some(item=>!item.external&&pathname.startsWith(item.href))).map(section=>section.label));
  useEffect(()=>{setOpen(null)},[pathname]);
  useEffect(()=>{function close(event:MouseEvent){if(!headerRef.current?.contains(event.target as Node))setOpen(null)}document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close)},[]);
  async function logout(){if(loggingOut)return;setLoggingOut(true);try{await fetch("/api/medicos-auth/logout",{method:"POST"})}finally{router.push("/medicos-login");router.refresh()}}
  const canValidate=doctor.role!=="portal"; const canAdmin=doctor.role==="admin";
  const desktopArea=pathname==="/portal-medicos"||pathname.startsWith("/portal-medicos/medicamentos/")||pathname.startsWith("/portal-medicos/indicaciones/")||pathname.startsWith("/portal-medicos/derivaciones/");
  return <div className="min-h-screen bg-[#f4f7f6] text-slate-900">
    <header ref={headerRef} className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex min-h-[76px] max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:flex-nowrap lg:px-8">
        <div className="relative flex min-w-0 items-center">
          <Link href="/portal-medicos" aria-label="Ir al escritorio" className="mr-2 shrink-0"><BrandLogo showWordmark={false}/></Link>
          <button type="button" onClick={()=>setOpen(open==="profile"?null:"profile")} className="flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-slate-50" aria-expanded={open==="profile"}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-900">{medicalPortalInitials(doctor)}</span>
            <span className="min-w-0"><span className="block max-w-48 truncate text-sm font-bold text-slate-950">{doctor.name}</span><span className="block max-w-48 truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{doctor.specialty || "Especialidad no configurada"}</span></span>
            <PortalIcon name="chevron" className={`h-4 w-4 shrink-0 text-slate-400 transition ${open==="profile"?"rotate-180":""}`}/>
          </button>
          {open==="profile"?<div className="absolute left-0 top-[calc(100%+10px)] w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"><div className="border-b border-slate-100 px-3 py-3"><p className="truncate text-sm font-semibold">{doctor.name}</p><p className="mt-1 truncate text-xs text-slate-500">{doctor.email}</p></div><Link href="/portal-medicos/perfil" className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-emerald-50"><PortalIcon name="user" className="h-4 w-4"/>Editar perfil</Link>{canValidate?<Link href="/portal-medicos/mis-recetas" className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-emerald-50"><PortalIcon name="document" className="h-4 w-4"/>Mis recetas</Link>:null}<button onClick={logout} disabled={loggingOut} className="mt-1 flex w-full items-center gap-2 border-t border-slate-100 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"><PortalIcon name="logout" className="h-4 w-4"/>{loggingOut?"Cerrando sesión…":"Cerrar sesión"}</button></div>:null}
        </div>
        <nav className="ml-auto flex w-full items-center gap-2 overflow-visible lg:w-auto" aria-label="Navegación principal médica">
          <HeaderLink href="/portal-medicos" label="Escritorio" icon="home" active={desktopArea}/>
          {canValidate?<HeaderMenu label="Validación" icon="document" items={validationItems} pathname={pathname} open={open==="validation"} onToggle={()=>setOpen(open==="validation"?null:"validation")}/>:null}
          {canAdmin?<HeaderMenu label="Administración" icon="users" items={administrationItems} pathname={pathname} open={open==="administration"} onToggle={()=>setOpen(open==="administration"?null:"administration")}/>:null}
        </nav>
      </div>
    </header>
    <div className={`mx-auto w-full max-w-[1600px] ${desktopArea?"lg:flex":""}`}>
      {desktopArea?<aside className="border-b border-slate-200 bg-white p-4 lg:min-h-[calc(100vh-77px)] lg:w-[292px] lg:shrink-0 lg:border-b-0 lg:border-r lg:p-5"><p className="px-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Herramientas clínicas</p><nav className="mt-4 space-y-2" aria-label="Herramientas clínicas del escritorio">{clinicalSections.map(section=>{const sectionOpen=openClinical.includes(section.label);return <div key={section.label}><button type="button" onClick={()=>setOpenClinical(current=>current.includes(section.label)?current.filter(value=>value!==section.label):[...current,section.label])} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-emerald-50" aria-expanded={sectionOpen}><PortalIcon name={section.icon} className="h-5 w-5 text-emerald-700"/><span className="flex-1">{section.label}</span><PortalIcon name="chevron" className={`h-4 w-4 transition ${sectionOpen?"rotate-180":""}`}/></button>{sectionOpen?<div className="ml-6 border-l border-slate-200 pl-3">{section.items.map(item=>{const className=`mt-1 flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${!item.external&&pathname===item.href?"bg-emerald-100 font-semibold text-emerald-950":"text-slate-600 hover:bg-slate-50"}`;return item.external?<a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className={className}>{item.label}<PortalIcon name="external" className="h-4 w-4"/></a>:<Link key={item.href} href={item.href} className={className}>{item.label}</Link>})}</div>:null}</div>})}</nav></aside>:null}
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  </div>
}
function HeaderLink({href,label,icon,active}:{href:string;label:string;icon:PortalIconName;active:boolean}){return <Link href={href} aria-current={active?"page":undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active?"bg-emerald-100 text-emerald-950":"text-slate-700 hover:bg-slate-100"}`}><PortalIcon name={icon} className="h-5 w-5"/><span>{label}</span></Link>}
function HeaderMenu({label,icon,items,pathname,open,onToggle}:{label:string;icon:PortalIconName;items:MenuItem[];pathname:string;open:boolean;onToggle:()=>void}){const active=items.some(item=>pathname.startsWith(item.href))||(label==="Validación"&&pathname.startsWith("/portal-medicos/orden/"));return <div className="relative"><button type="button" onClick={onToggle} aria-expanded={open} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active?"bg-emerald-100 text-emerald-950":"text-slate-700 hover:bg-slate-100"}`}><PortalIcon name={icon} className="h-5 w-5"/><span>{label}</span><PortalIcon name="chevron" className={`h-4 w-4 transition ${open?"rotate-180":""}`}/></button>{open?<div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">{items.map(item=><Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${pathname.startsWith(item.href)?"bg-emerald-50 text-emerald-950":"text-slate-700 hover:bg-slate-50"}`}><PortalIcon name={item.icon} className="h-4 w-4 text-emerald-700"/>{item.label}</Link>)}</div>:null}</div>}
