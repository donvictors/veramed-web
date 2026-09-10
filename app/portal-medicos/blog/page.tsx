import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { blogPostDto, getBlogAdmin } from "@/lib/server/blog-store";
import BlogManager from "./BlogManager";

export default async function BlogManagementPage() {
  if (!await getBlogAdmin()) redirect("/portal-medicos");
  const posts = await prisma.blogPost.findMany({ orderBy: { updatedAt: "desc" } });
  return <BlogManager posts={posts.map(blogPostDto)} />;
}
