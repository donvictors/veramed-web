import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const posts = JSON.parse(readFileSync("data/blog-posts.json", "utf8"));
const post = posts.find((candidate) => candidate.slug === "dolor-menstrual-intenso-endometriosis");

test("la entrada de endometriosis está en el catálogo central", () => {
  assert.ok(post);
  assert.equal(post.category, "Salud femenina");
  assert.equal(post.authorName, "Equipo Veramed");
  assert.equal(post.readTimeMinutes, 4);
  assert.equal(post.publishedAt, "2026-09-20");
});

test("el artículo mantiene un único H1 en la plantilla", () => {
  assert.doesNotMatch(post.content, /^# /m);
  assert.match(post.content, /^## ¿Cómo es el dolor de la endometriosis\?$/m);
  const page = readFileSync("app/blog/[slug]/page.tsx", "utf8");
  assert.equal((page.match(/<h1/g) ?? []).length, 1);
});

test("el SEO específico incluye canonical, Open Graph y Twitter", () => {
  assert.equal(post.seoTitle, "Dolor menstrual intenso y endometriosis: qué hacer | Veramed");
  assert.equal(post.ogTitle, "Dolor menstrual intenso y endometriosis: qué puedes hacer");
  const page = readFileSync("app/blog/[slug]/page.tsx", "utf8");
  for (const value of ["alternates: { canonical: url }", "type: \"article\"", "twitter:", "summary_large_image"]) {
    assert.ok(page.includes(value), value);
  }
});

test("la portada local existe y tiene alt editorial", () => {
  assert.equal(post.image, "/brand/blog-endometriosis.png");
  assert.equal(post.coverImageAlt, "Ilustración sobre dolor menstrual y endometriosis");
  assert.ok(existsSync("public/brand/blog-endometriosis.png"));
});

test("el CTA usa la ruta real de kinesioterapia", () => {
  assert.ok(existsSync("app/kinesioterapia/page.tsx"));
  assert.match(post.content, /\[¿Necesitas una orden para kinesioterapia de piso pélvico\?\]\(\/kinesioterapia\)$/);
  assert.match(readFileSync("components/BlogContent.tsx", "utf8"), /standaloneLink/);
});

test("el blog y el sitio usan los nuevos títulos editoriales", () => {
  const blogPage = readFileSync("app/blog/page.tsx", "utf8");
  assert.match(blogPage, /Medicina clara para mejores decisiones\./);
  assert.doesNotMatch(blogPage, /Medicina clara para tomar mejores decisiones\./);

  const layout = readFileSync("app/layout.tsx", "utf8");
  assert.equal((layout.match(/Veramed \| Tu salud digital, más simple/g) ?? []).length, 2);
  assert.doesNotMatch(layout, /Veramed \| Órdenes médicas pensadas para ti/);
});
