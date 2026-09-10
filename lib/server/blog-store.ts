import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { BlogPost } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MEDICAL_PORTAL_SESSION_COOKIE, verifyMedicalPortalSessionToken } from "@/lib/server/medical-portal-auth";
import type { BlogPostDto } from "@/lib/blog";

export async function getBlogAdmin() {
  const jar = await cookies();
  const session = await verifyMedicalPortalSessionToken(jar.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value);
  return session?.role === "admin" ? session : null;
}

export function blogPostDto(post: BlogPost): BlogPostDto {
  return {
    id: post.id, slug: post.slug, title: post.title, summary: post.summary,
    category: post.category, coverImage: post.coverImage, content: post.content,
    authorName: post.authorName, seoTitle: post.seoTitle, seoDescription: post.seoDescription,
    status: post.status, version: post.version,
    publishedAt: post.publishedAt?.toISOString() ?? null, updatedAt: post.updatedAt.toISOString(),
  };
}

export const getPublishedBlogPost = cache(async (slug: string) => {
  return prisma.blogPost.findFirst({ where: { slug, status: "published" } });
});

export async function listPublishedBlogPosts() {
  return prisma.blogPost.findMany({ where: { status: "published" }, orderBy: [{ publishedAt: "desc" }, { id: "asc" }] });
}
