"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import BlogContent from "@/components/BlogContent";
import { BLOG_COVERS, blogPostSchema, blogReadTime, blogSlug, safeBlogUrl, type BlogPostDto, type BlogPostInput } from "@/lib/blog";

const inputClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

export default function BlogEditor({ initialPost, authorName }: { initialPost?: BlogPostDto; authorName: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialPost);
  const [form, setForm] = useState<BlogPostInput>(() => ({
    slug: initialPost?.slug ?? "", title: initialPost?.title ?? "", summary: initialPost?.summary ?? "",
    category: initialPost?.category ?? "Prevención", coverImage: initialPost?.coverImage ?? BLOG_COVERS[0].value,
    content: initialPost?.content ?? "", authorName: initialPost?.authorName ?? authorName,
    seoTitle: initialPost?.seoTitle ?? "", seoDescription: initialPost?.seoDescription ?? "", status: initialPost?.status ?? "draft",
  }));
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [issues, setIssues] = useState<Record<string, string[] | undefined>>({});
  const textarea = useRef<HTMLTextAreaElement>(null);
  const saving = useRef(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update(key: keyof BlogPostInput, value: string) {
    setForm(current => ({ ...current, [key]: value, ...(key === "title" && !saved && !slugEdited ? { slug: blogSlug(value) } : {}) }));
    setDirty(true); setNotice("");
  }

  function insert(before: string, example: string, after = "") {
    const element = textarea.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selection = form.content.slice(start, end) || example;
    update("content", form.content.slice(0, start) + before + selection + after + form.content.slice(end));
    requestAnimationFrame(() => { element.focus(); element.setSelectionRange(start + before.length, start + before.length + selection.length); });
  }

  async function save(status: "draft" | "published") {
    if (saving.current) return;
    const parsed = blogPostSchema.safeParse({ ...form, status });
    if (!parsed.success) {
      setIssues(parsed.error.flatten().fieldErrors); setError("Completa los campos indicados antes de guardar."); setPreview(false); return;
    }
    saving.current = true; setBusy(true); setError(""); setIssues({}); setNotice("");
    try {
      const response = await fetch(saved ? `/api/portal-medicos/blog/${saved.id}` : "/api/portal-medicos/blog", {
        method: saved ? "PUT" : "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...parsed.data, ...(saved ? { version: saved.version } : {}) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setIssues(result.issues ?? {}); throw new Error(result.error || "No pudimos guardar. Intenta nuevamente."); }
      setSaved(result.post); setForm(parsed.data); setDirty(false);
      setNotice(status === "published" ? "Entrada publicada. Ya está disponible en el blog." : "Borrador guardado. Esta entrada no es visible en el blog público.");
      if (!saved) router.replace(`/portal-medicos/blog/${result.post.id}`);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos guardar la entrada."); }
    finally { saving.current = false; setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void save(saved?.status ?? "draft"); }
  function fieldError(key: string) { return issues[key] ? <span className="mt-1 block text-xs text-rose-700">{issues[key]?.join(" ")}</span> : null; }

  return <div className="space-y-6">
    <Link href="/portal-medicos/blog" onClick={event => { if (dirty && !window.confirm("Hay cambios sin guardar. ¿Quieres salir de todas formas?")) event.preventDefault(); }} className="text-sm font-semibold text-emerald-800">← Todas las entradas</Link>
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Blog Veramed</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{saved ? "Editar entrada" : "Nueva entrada"}</h1></div><div className="flex items-center gap-3"><span className="text-xs text-slate-500">{dirty ? "Cambios sin guardar" : saved?.status === "published" ? "Publicada" : "Borrador"}</span><button type="button" onClick={() => setPreview(value => !value)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">{preview ? "Volver al editor" : "Vista previa"}</button></div></div>
    {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}
    {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice} {saved?.status === "published" ? <Link href={`/blog/${saved.slug}`} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Ver publicación ↗</Link> : null}</div> : null}
    <form onSubmit={submit}>
      <fieldset disabled={busy} className="min-w-0 disabled:opacity-70">
        {preview ? <article className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-10"><p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">{form.category}</p><h2 className="mt-4 text-4xl font-semibold tracking-tight">{form.title || "Título de tu entrada"}</h2><p className="mt-3 text-sm text-slate-500">{form.authorName} · {blogReadTime(form.content)} de lectura</p><p className="mt-5 text-lg leading-8 text-slate-600">{form.summary}</p>{safeBlogUrl(form.coverImage) ? <Image src={form.coverImage} alt={form.title} width={1366} height={768} unoptimized className="my-8 h-auto w-full rounded-xl" /> : null}<BlogContent content={form.content || "El contenido de tu entrada aparecerá aquí."} /></article> : <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <label className="block text-sm font-semibold">Título<input value={form.title} onChange={event => update("title", event.target.value)} maxLength={180} placeholder="¿Qué quieres compartir?" className={inputClass} />{fieldError("title")}</label>
            <label className="block text-sm font-semibold">Resumen<textarea value={form.summary} onChange={event => update("summary", event.target.value)} maxLength={500} rows={3} placeholder="Una introducción breve para la portada del blog." className={inputClass} />{fieldError("summary")}</label>
            <div><label htmlFor="blog-content" className="text-sm font-semibold">Contenido</label><div className="mt-2 flex flex-wrap gap-1 rounded-t-xl border border-b-0 border-slate-300 bg-slate-50 p-2">{[
              { label: "Subtítulo", before: "\n\n## ", example: "Subtítulo", after: "\n\n" },
              { label: "Sección", before: "\n\n### ", example: "Sección", after: "\n\n" },
              { label: "Negrita", before: "**", example: "Texto destacado", after: "**" },
              { label: "Lista", before: "\n\n- ", example: "Primer elemento\n- Segundo elemento", after: "\n\n" },
              { label: "Enlace", before: "[", example: "Texto del enlace", after: "](https://ejemplo.cl)" },
            ].map(tool => <button key={tool.label} type="button" onClick={() => insert(tool.before, tool.example, tool.after)} className="rounded-lg px-3 py-2 text-xs font-semibold hover:bg-white">{tool.label}</button>)}</div><textarea ref={textarea} id="blog-content" value={form.content} onChange={event => update("content", event.target.value)} maxLength={100000} rows={22} className="w-full rounded-b-xl border border-slate-300 p-4 text-sm leading-7 outline-none focus:border-emerald-600" placeholder="Escribe el artículo. Separa los párrafos con una línea en blanco." /><p className="mt-2 text-xs text-slate-500">Usa la barra para agregar formato y revisa el resultado en Vista previa. {blogReadTime(form.content)} de lectura.</p>{fieldError("content")}</div>
          </section>
          <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">Detalles de publicación</h2>
            <label className="block text-sm font-semibold">Categoría<input value={form.category} onChange={event => update("category", event.target.value)} maxLength={80} list="blog-categories" className={inputClass} /><datalist id="blog-categories"><option>Prevención</option><option>Screening de cáncer</option><option>Decisiones clínicas</option><option>Salud cotidiana</option></datalist>{fieldError("category")}</label>
            <label className="block text-sm font-semibold">Autor<input value={form.authorName} onChange={event => update("authorName", event.target.value)} maxLength={160} className={inputClass} />{fieldError("authorName")}</label>
            <label className="block text-sm font-semibold">Dirección del artículo<span className="mt-2 block text-xs font-normal text-slate-500">/blog/</span><input value={form.slug} onChange={event => { setSlugEdited(true); update("slug", event.target.value); }} disabled={Boolean(saved)} maxLength={120} className={inputClass} /><span className="mt-2 block text-xs font-normal text-slate-500">{saved ? "La dirección se conserva para mantener los enlaces existentes." : "Usa letras minúsculas, números y guiones."}</span>{fieldError("slug")}</label>
            <label className="block text-sm font-semibold">Imagen de portada<select value={BLOG_COVERS.some(cover => cover.value === form.coverImage) ? form.coverImage : "custom"} onChange={event => update("coverImage", event.target.value === "custom" ? "" : event.target.value)} className={inputClass}>{BLOG_COVERS.map(cover => <option key={cover.value} value={cover.value}>{cover.label}</option>)}<option value="custom">Otra imagen (URL)</option></select></label>
            <label className="block text-sm font-semibold">URL de la imagen<input value={form.coverImage} onChange={event => update("coverImage", event.target.value)} maxLength={1000} placeholder="https://…" className={inputClass} />{fieldError("coverImage")}</label>
            {safeBlogUrl(form.coverImage) ? <Image src={form.coverImage} alt="Vista previa de portada" width={400} height={225} unoptimized className="aspect-video w-full rounded-xl object-cover" /> : null}
            <details className="border-t border-slate-200 pt-4"><summary className="cursor-pointer text-sm font-semibold">Opciones para buscadores</summary><label className="mt-4 block text-sm">Título SEO<input value={form.seoTitle} onChange={event => update("seoTitle", event.target.value)} placeholder="Usar el título del artículo" maxLength={200} className={inputClass} /></label><label className="mt-4 block text-sm">Descripción SEO<textarea value={form.seoDescription} onChange={event => update("seoDescription", event.target.value)} placeholder="Usar el resumen" maxLength={500} rows={3} className={inputClass} /></label></details>
          </aside>
        </div>}
        <div className="sticky bottom-3 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur"><p className="text-xs text-slate-500">{busy ? "Guardando…" : saved?.status === "published" ? "Los cambios guardados se verán en el blog público." : "Los borradores solo son visibles en el portal."}</p><div className="flex flex-wrap gap-3"><button type="button" onClick={() => { if (saved?.status !== "published" || window.confirm("¿Retirar esta entrada del blog público y conservarla como borrador?")) void save("draft"); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">{saved?.status === "published" ? "Retirar publicación" : "Guardar borrador"}</button><button type="button" onClick={() => void save("published")} className="rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900">{saved?.status === "published" ? "Guardar cambios" : "Publicar entrada"}</button></div></div>
      </fieldset>
    </form>
  </div>;
}
