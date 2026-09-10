import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { blogPostDto, getBlogAdmin } from "@/lib/server/blog-store";
import BlogEditor from "../BlogEditor";

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getBlogAdmin();
  if (!session) redirect("/portal-medicos");
  const { id } = await params;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) notFound();
  return <BlogEditor authorName={session.name} initialPost={blogPostDto(post)} />;
}
