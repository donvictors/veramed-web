import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

const require = createRequire(import.meta.url);
function moduleFrom(path, mocks = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, {
    exports, require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name), URL, Date,
  });
  return exports;
}
const blog = moduleFrom('lib/blog.ts');
const input = { slug: 'entrada-de-prueba', title: 'Entrada de prueba', summary: 'Resumen de la entrada de prueba.', category: 'Prevención', coverImage: '/brand/blog-colon.png', content: 'Contenido sintético para comprobar el editor.', authorName: 'Equipo de prueba', status: 'draft', seoTitle: '', seoDescription: '' };

class HttpRequestError extends Error { constructor(message, status) { super(message); this.status = status; } }
const response = { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) };
function api(path, { admin = true, prisma = {} } = {}) {
  return moduleFrom(path, {
    '@/lib/blog': blog, '@/lib/prisma': { prisma },
    'next/server': { NextResponse: response },
    '@/lib/server/blog-store': { getBlogAdmin: async () => admin ? { role: 'admin' } : null, blogPostDto: post => post },
    '@/lib/server/http-security': {
      HttpRequestError,
      requireSameOrigin: request => { if (request.origin === 'foreign') throw new HttpRequestError('Origen no autorizado.', 403); },
      readJsonBody: async request => request.body,
      httpErrorResponse: error => response.json({ error: error.message }, { status: error.status ?? 500 }),
    },
  });
}

test('valida URLs, slugs y contenido sin aceptar protocolos ejecutables', () => {
  assert.equal(blog.blogSlug('¡Prevención y corazón!'), 'prevencion-y-corazon');
  for (const value of ['javascript:alert(1)', 'data:text/html,test', '//evil.example', '/\\evil.example', 'http://example.com']) assert.equal(blog.safeBlogUrl(value), false);
  assert.equal(blog.safeBlogUrl('https://example.com/image.png'), true);
  assert.equal(blog.blogPostSchema.safeParse(input).success, true);
  for (const change of [{ slug: 'que-examenes-de-chequeo-preventivo' }, { content: '' }, { status: 'invalid' }, { slug: '../foo' }, { coverImage: 'javascript:alert(1)' }]) assert.equal(blog.blogPostSchema.safeParse({ ...input, ...change }).success, false);
});

test('renderiza el formato y escapa HTML y enlaces peligrosos en vista previa y publicación', () => {
  const Content = moduleFrom('components/BlogContent.tsx', { '@/lib/blog': blog }).default;
  const html = renderToStaticMarkup(createElement(Content, { content: '## Subtítulo\n\n**Importante** y [fuente](https://example.com).\n\n- Uno\n- Dos\n\n<script>alert(1)</script>\n\n[malo](javascript:alert)' }));
  assert.match(html, /<h2/); assert.match(html, /<strong>Importante<\/strong>/); assert.match(html, /<ul/);
  assert.match(html, /href="https:\/\/example.com"/); assert.doesNotMatch(html, /<script|href="javascript:/);
  assert.match(html, /&lt;script&gt;/);
});

test('crear y editar exige administrador y mismo origen', async () => {
  for (const [path, method] of [['app/api/portal-medicos/blog/route.ts', 'POST'], ['app/api/portal-medicos/blog/[id]/route.ts', 'PUT']]) {
    const context = { params: Promise.resolve({ id: 'test' }) };
    assert.equal((await api(path, { admin: false })[method]({ body: input }, context)).status, 403);
    assert.equal((await api(path)[method]({ origin: 'foreign', body: input }, context)).status, 403);
  }
});

test('crear borrador no publica; publicar asigna una fecha', async () => {
  const route = api('app/api/portal-medicos/blog/route.ts', { prisma: { blogPost: { create: async ({ data }) => data } } });
  const draft = await route.POST({ body: input });
  assert.equal(draft.status, 201); assert.equal(draft.body.post.publishedAt, null);
  const published = await route.POST({ body: { ...input, status: 'published' } });
  assert.equal(published.status, 201); assert.ok(published.body.post.publishedAt instanceof Date);
  assert.equal((await route.POST({ body: { ...input, content: '' } })).status, 400);
});

test('editar conserva URL y fecha, permite retirar y evita sobrescribir otra sesión', async () => {
  let current = { ...input, id: 'test', status: 'published', publishedAt: new Date('2026-03-27T12:00:00Z'), version: 2 };
  const tx = { blogPost: {
    findUnique: async () => current,
    updateMany: async ({ where, data }) => { if (where.version !== current.version) return { count: 0 }; current = { ...current, ...data, version: current.version + 1 }; return { count: 1 }; },
    findUniqueOrThrow: async () => current,
  } };
  const route = api('app/api/portal-medicos/blog/[id]/route.ts', { prisma: { $transaction: fn => fn(tx) } });
  const context = { params: Promise.resolve({ id: 'test' }) };
  assert.equal((await route.PUT({ body: { ...input, version: 1 } }, context)).status, 409);
  assert.equal((await route.PUT({ body: { ...input, slug: 'otro-enlace', version: 2 } }, context)).status, 400);
  const retired = await route.PUT({ body: { ...input, version: 2 } }, context);
  assert.equal(retired.status, 200); assert.equal(retired.body.post.status, 'draft');
  assert.equal(retired.body.post.publishedAt.toISOString(), '2026-03-27T12:00:00.000Z');
});

test('las consultas públicas excluyen borradores por listado y por URL directa', async () => {
  const calls = [];
  const store = moduleFrom('lib/server/blog-store.ts', {
    'server-only': {}, react: { cache: fn => fn }, 'next/headers': {},
    '@/lib/server/medical-portal-auth': {},
    '@/lib/prisma': { prisma: { blogPost: {
      findFirst: async args => { calls.push(args); return null; },
      findMany: async args => { calls.push(args); return []; },
    } } },
  });
  await store.getPublishedBlogPost('borrador'); await store.listPublishedBlogPosts();
  assert.equal(calls.length, 2);
  for (const call of calls) assert.equal(call.where.status, 'published');
  assert.equal(calls[0].where.slug, 'borrador');
});
