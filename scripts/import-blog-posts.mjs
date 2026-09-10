import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const prisma = new PrismaClient();
try {
  const posts = JSON.parse(readFileSync(new URL("../data/blog-posts.json", import.meta.url), "utf8"));
  for (const post of posts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {}, // Rerunning the import must never overwrite editorial changes.
      create: {
        slug: post.slug, title: post.title, summary: post.summary, category: post.category,
        coverImage: post.image, content: post.content, authorName: "Equipo Veramed",
        seoTitle: post.seoTitle, seoDescription: post.seoDescription, keywords: post.keywords,
        status: "published", publishedAt: new Date(`${post.publishedAt}T12:00:00Z`),
      },
    });
  }
  console.log(`Importación completada: ${posts.length} entradas existentes conservadas.`);
} finally {
  await prisma.$disconnect();
}
