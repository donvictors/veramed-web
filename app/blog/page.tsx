import Link from "next/link";

const posts = [
  {
    title: "¿Qué exámenes de chequeo preventivo vale la pena hacerse?",
    summary:
      "Una guía simple para entender qué se solicita por edad, sexo y factores de riesgo, y por qué no existe un panel único para todas las personas.",
    category: "Prevención",
    date: "04 marzo 2026",
    readTime: "6 min",
    href: "/blog/que-examenes-de-chequeo-preventivo",
  },
  {
    title: "Cascadas diagnósticas y sobrediagnóstico: cuándo más exámenes no es mejor",
    summary:
      "Qué son las cascadas diagnósticas, por qué ocurren tras hallazgos incidentales y cómo evitar estudios innecesarios en prevención.",
    category: "Decisiones clínicas",
    date: "04 marzo 2026",
    readTime: "6 min",
    href: "",
  },
  {
    title: "Interpretar resultados sin ansiedad: qué mirar y cuándo consultar",
    summary:
      "Claves para leer tus resultados con contexto clínico y reconocer cuándo corresponde evaluación médica presencial.",
    category: "Educación clínica",
    date: "04 marzo 2026",
    readTime: "7 min",
    href: "",
  },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Blog</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Educación en salud, en lenguaje claro. 📚
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            Este espacio reúne contenidos educativos para ayudarte a entender mejor los exámenes de
            laboratorio, su preparación y el contexto clínico en que deben interpretarse.
          </p>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.title}
              className="flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-white p-6"
            >
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <span>{post.category}</span>
                <span>{post.readTime}</span>
              </div>

              <h2 className="mt-4 text-xl font-semibold leading-7 text-slate-950">{post.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{post.summary}</p>

              <div className="mt-auto pt-6">
                <p className="text-xs text-slate-500">{post.date}</p>
                {post.href ? (
                  <Link
                    href={post.href}
                    className="mt-3 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    Leer artículo
                  </Link>
                ) : (
                  <span className="mt-3 inline-flex rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
                    Próximamente
                  </span>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold text-slate-900">Próximamente</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Estaremos publicando frecuentemente contenido sobre medicina y salud, con enfásis en
            medicina preventiva y problemas de salud frecuentes en Chile.
          </p>
          <Link
            href="/contacto"
            className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Sugerir un tema
          </Link>
        </section>
      </div>
    </main>
  );
}
