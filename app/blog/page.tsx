import Image from "next/image";
import Link from "next/link";

const posts = [
  {
    title: "Pólipos de colon: la montaña silenciosa",
    summary:
      "¿Te hiciste una colonoscopía y encontraron pólipos? Te explicamos qué son y qué seguimiento podrías necesitar.",
    category: "Screening de cáncer",
    date: "27 marzo 2026",
    publishedAt: "2026-03-27",
    readTime: "5 min",
    href: "/blog/polipos-de-colon-la-montana-silenciosa",
    image: "/brand/blog-polyps.png",
  },
  {
    title: "Chequeo preventivo: qué exámenes hacerte según tu edad",
    summary:
      "Una guía simple para entender qué se solicita por edad, sexo y factores de riesgo, y por qué no existe un panel único para todas las personas.",
    category: "Prevención",
    date: "04 marzo 2026",
    publishedAt: "2026-03-04",
    readTime: "6 min",
    href: "/blog/examenes-chequeo-preventivo",
    image: "/brand/voxel-check_up.png",
  },
  {
    title: "Cascadas diagnósticas: cuándo más exámenes no es mejor",
    summary:
      "Qué son las cascadas diagnósticas, por qué ocurren tras hallazgos incidentales y cómo evitar estudios innecesarios en prevención.",
    category: "Decisiones clínicas",
    date: "13 marzo 2026",
    publishedAt: "2026-03-13",
    readTime: "6 min",
    href: "/blog/cascadas-diagnosticas-sobrediagnostico",
    image: "/brand/voxel-cascadas_dg.png",
  },
  {
    title: "Colonoscopía: qué es, cómo prepararse y qué esperar",
    summary:
      "Te explicamos de forma simple cómo este examen ayuda a detectar problemas a tiempo e incluso prevenir el cáncer de colon.",
    category: "Screening de cáncer",
    date: "20 marzo 2026",
    publishedAt: "2026-03-20",
    readTime: "5 min",
    href: "/blog/colonoscopia-que-es-como-prepararse-y-que-esperar-del-examen",
    image: "/brand/blog-colon.png",
  },
];

export default function BlogPage() {
  const sortedPosts = [...posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const [featuredPost, ...otherPosts] = sortedPosts;

  return (
    <main className="veramed-page min-h-screen text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <section className="grid items-end gap-8 border-b border-slate-200 pb-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="veramed-kicker">Blog Veramed</p>
            <h1 className="veramed-display mt-5 max-w-3xl text-4xl md:text-6xl">
              Medicina clara para tomar mejores decisiones.
            </h1>
          </div>
          <p className="max-w-xl text-base leading-8 text-slate-600 lg:pb-1">
            Prevención, exámenes y salud cotidiana explicados sin tecnicismos innecesarios y con
            contexto clínico.
          </p>
        </section>

        {featuredPost ? (
          <article className="veramed-dark-panel mt-10 grid overflow-hidden lg:grid-cols-[1.08fr_0.92fr]">
            <div className="flex flex-col p-8 md:p-10 lg:p-12">
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em]">
                <span className="text-emerald-300">Última publicación</span>
                <span className="text-slate-500" aria-hidden="true">•</span>
                <span className="text-slate-400">{featuredPost.readTime} de lectura</span>
              </div>
              <h2 className="mt-6 max-w-2xl text-3xl font-semibold tracking-tight text-white md:text-5xl">
                {featuredPost.title}
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">
                {featuredPost.summary}
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4 lg:mt-auto lg:pt-10">
                <Link
                  href={featuredPost.href}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                >
                  Leer artículo <span aria-hidden="true">→</span>
                </Link>
                <span className="text-xs text-slate-400">{featuredPost.date}</span>
              </div>
            </div>
            <div className="veramed-grid-surface relative min-h-[22rem] overflow-hidden border-0 bg-emerald-50 lg:min-h-[32rem] lg:rounded-none">
              <Image
                src={featuredPost.image}
                alt="Ilustración del artículo sobre pólipos de colon"
                fill
                sizes="(min-width: 1024px) 42vw, 100vw"
                className="object-cover"
                priority
              />
            </div>
          </article>
        ) : null}

        <section className="mt-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="veramed-kicker">Explora</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Artículos recientes
              </h2>
            </div>
            <span className="hidden text-sm text-slate-500 md:block">Información para cuidarte mejor</span>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {otherPosts.map((post) => (
              <article
                key={post.title}
                className="veramed-panel group flex h-full flex-col overflow-hidden p-0 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)]"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-emerald-50">
                  <Image
                    src={post.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500">
                    <span>{post.category}</span>
                    <span>{post.readTime}</span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold leading-7 tracking-tight text-slate-950">
                    {post.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{post.summary}</p>
                  <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                    <span className="text-xs text-slate-500">{post.date}</span>
                    <Link href={post.href} className="text-sm font-semibold text-emerald-700 hover:text-emerald-600">
                      Leer <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="veramed-panel mt-12 flex flex-col items-start justify-between gap-6 p-7 md:flex-row md:items-center md:p-9">
          <div>
            <p className="veramed-kicker">Tu opinión importa</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              ¿Qué tema te gustaría entender mejor?
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Cuéntanos qué contenido de medicina o prevención te resultaría útil.
            </p>
          </div>
          <Link href="/contacto" className="veramed-primary-button shrink-0">
            Sugerir un tema
          </Link>
        </section>
      </div>
    </main>
  );
}
