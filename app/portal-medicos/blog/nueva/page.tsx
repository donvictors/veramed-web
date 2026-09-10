import { redirect } from "next/navigation";
import { getBlogAdmin } from "@/lib/server/blog-store";
import BlogEditor from "../BlogEditor";

export default async function NewBlogPostPage() {
  const session = await getBlogAdmin();
  if (!session) redirect("/portal-medicos");
  return <BlogEditor authorName={session.name} />;
}
