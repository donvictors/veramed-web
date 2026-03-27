"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type BlogArchivePost = {
  title: string;
  date: string;
  publishedAt: string;
  href: string;
};

function toMonthKey(isoDate: string) {
  return isoDate.slice(0, 7);
}

function toMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const monthNames = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const monthIndex = Number(month) - 1;
  const monthName = monthNames[monthIndex] ?? month;
  return `${monthName} ${year}`;
}

export default function BlogArchive({ posts }: { posts: BlogArchivePost[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [monthFilter, setMonthFilter] = useState("all");

  const monthOptions = useMemo(() => {
    const keys = Array.from(new Set(posts.map((post) => toMonthKey(post.publishedAt))));
    return keys.sort((a, b) => b.localeCompare(a));
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (monthFilter === "all") {
      return posts;
    }
    return posts.filter((post) => toMonthKey(post.publishedAt) === monthFilter);
  }, [monthFilter, posts]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-slate-900">Ver publicaciones anteriores</span>
        <span className="text-sm text-slate-500">{isOpen ? "↑" : "↓"}</span>
      </button>

      {isOpen ? (
        <div className="border-t border-slate-200 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="blog-archive-month" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Filtrar por fecha
            </label>
            <select
              id="blog-archive-month"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
            >
              <option value="all">Todas</option>
              {monthOptions.map((monthKey) => (
                <option key={monthKey} value={monthKey}>
                  {toMonthLabel(monthKey)}
                </option>
              ))}
            </select>
          </div>

          {filteredPosts.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {filteredPosts.map((post) => (
                <li key={`${post.publishedAt}-${post.title}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-xs font-medium text-slate-500">{post.date}</span>
                  {post.href ? (
                    <Link href={post.href} className="text-sm font-medium text-slate-900 hover:underline">
                      {post.title}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-slate-500">{post.title}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Aún no hay publicaciones anteriores.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
