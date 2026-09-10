import { Fragment, type ReactNode } from "react";
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
      if (block.startsWith("### ")) return <h3 key={index} className="pt-2 text-xl font-semibold text-slate-950">{inline(block.slice(4))}</h3>;
      if (block.startsWith("## ")) return <h2 key={index} className="pt-4 text-2xl font-semibold tracking-tight text-slate-950">{inline(block.slice(3))}</h2>;
      const lines = block.split("\n");
      if (lines.every(line => /^- /.test(line))) return <ul key={index} className="list-disc space-y-2 pl-6">{lines.map((line, i) => <li key={i}>{inline(line.slice(2))}</li>)}</ul>;
      return <p key={index} className="whitespace-pre-line">{inline(block)}</p>;
    })}
  </div>;
}
