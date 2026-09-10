"use client";

import Link from "next/link";
import { useState } from "react";
import { blogDate, type BlogPostDto } from "@/lib/blog";

export default function BlogManager({ posts }: { posts: BlogPostDto[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const visible = posts.filter(post => (filter === "all" || post.status === filter) && `${post.title} ${post.category}`.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")));
  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Contenido y publicaciones</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Blog</h1><p className="mt-2 text-sm text-slate-600">Administra los artículos de Veramed y prepara tu próxima publicación.</p></div>
      <div className="flex gap-3"><Link href="/blog" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold">Ver blog público ↗</Link><Link href="/portal-medicos/blog/nueva" className="rounded-xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-900">+ Nueva entrada</Link></div>
    </div>
    <div className="grid gap-4 sm:grid-cols-3">{[
      ["Total de entradas", posts.length], ["Publicadas", posts.filter(p => p.status === "published").length], ["Borradores", posts.filter(p => p.status === "draft").length],
    ].map(([label, count]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{count}</p></div>)}</div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap gap-3 border-b border-slate-200 p-5"><input aria-label="Buscar entradas" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por título o categoría…" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm" /><select aria-label="Filtrar por estado" value={filter} onChange={event => setFilter(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm"><option value="all">Todos los estados</option><option value="published">Publicadas</option><option value="draft">Borradores</option></select></div>
      {visible.length ? <ul className="divide-y divide-slate-100">{visible.map(post => <li key={post.id} className="flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6"><div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${post.status === "published" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{post.status === "published" ? "Publicada" : "Borrador"}</span><span className="text-xs text-slate-500">{post.category}</span></div><Link href={`/portal-medicos/blog/${post.id}`} className="text-lg font-semibold hover:text-emerald-800">{post.title}</Link><p className="mt-2 text-xs text-slate-500">{post.authorName} · Actualizada el {blogDate(post.updatedAt)}</p></div><div className="flex gap-3">{post.status === "published" ? <Link href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Ver ↗</Link> : null}<Link href={`/portal-medicos/blog/${post.id}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-emerald-50">Editar</Link></div></li>)}</ul> : <div className="px-6 py-16 text-center"><h2 className="font-semibold">{posts.length ? "No hay entradas que coincidan" : "Tu próxima publicación comienza aquí"}</h2><p className="mt-2 text-sm text-slate-500">{posts.length ? "Prueba otra búsqueda o cambia el filtro." : "Crea una entrada y guárdala como borrador antes de publicarla."}</p></div>}
    </section>
  </div>;
}
