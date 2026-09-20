import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import BlogContent from "@/components/BlogContent";
import { blogDate, blogReadTime } from "@/lib/blog";
import { getPublishedBlogPost } from "@/lib/server/blog-store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);
  if (!post) notFound();
  const title = post.seoTitle || `${post.title} | Veramed`;
  const description = post.seoDescription || post.summary;
  const url = `https://www.veramed.cl/blog/${post.slug}`;
  const socialTitle = post.ogTitle || title;
  const socialDescription = post.ogDescription || description;
  const imageAlt = post.coverImageAlt || post.title;
  const imageUrl = new URL(post.coverImage, "https://www.veramed.cl").toString();
  return {
    title, description,
    keywords: Array.isArray(post.keywords) ? post.keywords.filter((word): word is string => typeof word === "string") : [],
    alternates: { canonical: url },
    openGraph: { title: socialTitle, description: socialDescription, url, siteName: "Veramed", type: "article", locale: "es_CL", publishedTime: post.publishedAt?.toISOString(), modifiedTime: post.updatedAt.toISOString(), images: [{ url: imageUrl, alt: imageAlt }] },
    twitter: { card: "summary_large_image", title: socialTitle, description: socialDescription, images: [{ url: imageUrl, alt: imageAlt }] },
  };
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);
  if (!post) notFound();
  return <main className="veramed-page min-h-screen bg-slate-50 text-slate-900">
    <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
      <Link href="/blog" className="text-sm font-semibold text-emerald-700">← Volver al blog</Link>
      <article className="veramed-panel mt-6 overflow-hidden p-7 md:p-10">
        <p className="veramed-kicker">{post.category}</p>
        <h1 className="veramed-display mt-4 text-4xl md:text-5xl">{post.title}</h1>
        <p className="mt-4 text-sm text-slate-500">{blogDate(post.publishedAt ?? post.createdAt)} · {post.authorName} · {blogReadTime(post.content, post.readTimeMinutes)} de lectura</p>
        <div className="my-8 overflow-hidden rounded-2xl border border-slate-200"><Image src={post.coverImage} alt={post.coverImageAlt || post.title} width={1536} height={1024} className="h-auto w-full" priority unoptimized /></div>
        <BlogContent content={post.content} />
      </article>
    </div>
  </main>;
}
