import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { safeBlogUrl } from "@/lib/blog";

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^\s)]+\))/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
    if (link && safeBlogUrl(link[2])) return <a key={index} href={link[2]} className="font-medium text-emerald-700 underline underline-offset-4" rel="noopener noreferrer">{link[1]}</a>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

// Render text as React nodes. Authored HTML is never executed, including in previews.
export default function BlogContent({ content }: { content: string }) {
  const blocks = content.replace(/\r\n/g, "\n").split(/\n\s*\n/).filter(block => block.trim());
  return <div className="space-y-6 text-base leading-8 text-slate-700">
    {blocks.map((block, index) => {
      const standaloneLink = block.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
      if (standaloneLink && safeBlogUrl(standaloneLink[2])) {
        const className = "group flex w-full items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-4 font-semibold leading-6 text-slate-950 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-400";
        const content = <>{standaloneLink[1]}<span className="shrink-0 text-emerald-700 transition group-hover:translate-x-1" aria-hidden="true">→</span></>;
        return standaloneLink[2].startsWith("/")
          ? <Link key={index} href={standaloneLink[2]} className={className}>{content}</Link>
          : <a key={index} href={standaloneLink[2]} className={className} rel="noopener noreferrer">{content}</a>;
      }
      if (block.startsWith("### ")) return <h3 key={index} className="pt-2 text-xl font-semibold text-slate-950">{inline(block.slice(4))}</h3>;
      if (block.startsWith("## ")) return <h2 key={index} className="pt-4 text-2xl font-semibold tracking-tight text-slate-950">{inline(block.slice(3))}</h2>;
      const lines = block.split("\n");
      if (lines.every(line => /^- /.test(line))) return <ul key={index} className="list-disc space-y-2 pl-6">{lines.map((line, i) => <li key={i}>{inline(line.slice(2))}</li>)}</ul>;
      return <p key={index} className="whitespace-pre-line">{inline(block)}</p>;
    })}
  </div>;
}
