import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { blogPostSchema } from "@/lib/blog";
import { blogPostDto, getBlogAdmin } from "@/lib/server/blog-store";
import { httpErrorResponse, readJsonBody, requireSameOrigin } from "@/lib/server/http-security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await getBlogAdmin();
    if (!session) return NextResponse.json({ error: "Solo los administradores pueden gestionar el blog." }, { status: 403 });
    const parsed = blogPostSchema.safeParse(await readJsonBody(request, 420_000));
    if (!parsed.success) return NextResponse.json({ error: "Revisa los campos de la entrada.", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    const post = await prisma.blogPost.create({ data: {
      ...parsed.data, publishedAt: parsed.data.status === "published" ? new Date() : null,
    } });
    return NextResponse.json({ post: blogPostDto(post) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe una entrada con esta dirección. Elige otra." }, { status: 409 });
    }
    return httpErrorResponse(error, "No pudimos guardar la entrada. Intenta nuevamente.");
  }
}
