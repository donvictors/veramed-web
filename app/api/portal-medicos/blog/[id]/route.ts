import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { blogPostSchema } from "@/lib/blog";
import { blogPostDto, getBlogAdmin } from "@/lib/server/blog-store";
import { HttpRequestError, httpErrorResponse, readJsonBody, requireSameOrigin } from "@/lib/server/http-security";
import { z } from "zod";

const updateSchema = blogPostSchema.extend({ version: z.number().int().positive() });

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    if (!await getBlogAdmin()) return NextResponse.json({ error: "Solo los administradores pueden gestionar el blog." }, { status: 403 });
    const { id } = await params;
    const parsed = updateSchema.safeParse(await readJsonBody(request, 420_000));
    if (!parsed.success) return NextResponse.json({ error: "Revisa los campos de la entrada.", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    const { version, ...data } = parsed.data;
    const post = await prisma.$transaction(async tx => {
      const current = await tx.blogPost.findUnique({ where: { id } });
      if (!current) throw new HttpRequestError("Entrada no encontrada.", 404);
      if (current.slug !== data.slug) throw new HttpRequestError("La dirección de una entrada guardada no se puede cambiar.", 400);
      const updated = await tx.blogPost.updateMany({
        where: { id, version },
        data: { ...data, version: { increment: 1 }, publishedAt: current.publishedAt ?? (data.status === "published" ? new Date() : null) },
      });
      if (updated.count !== 1) throw new HttpRequestError("Esta entrada cambió en otra sesión. Copia tus cambios y recarga antes de guardar.", 409);
      return tx.blogPost.findUniqueOrThrow({ where: { id } });
    });
    return NextResponse.json({ post: blogPostDto(post) });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos guardar los cambios. Intenta nuevamente.");
  }
}
