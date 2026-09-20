const reviews = [
  {
    name: "Camila Morales",
    review:
      "Muy práctico y útil. Además, a diferencia de otras páginas, si no sabes qué exámenes necesitas hacerte acá te orientan igual que una consulta médica. Todo el proceso fue sencillo y recibí mi orden rápidamente.",
  },
  {
    name: "Cecilia Pérez",
    review:
      "Excelente servicio y atención muy personalizada. La evaluación con inteligencia artificial eligió los exámenes que necesitaba antes de la consulta con el médico y me ahorró mucho tiempo!",
  },
  {
    name: "Francisco Herrera",
    review:
      "Excelente servicio, rápido y completo. Me orientaron muy bien durante el proceso y respondieron todas mis dudas. Muy buena experiencia con Veramed.",
  },
  {
    name: "Raúl Contreras",
    review:
      "Necesitaba una orden para hacerme exámenes al día siguiente y pude resolverlo rápidamente desde mi casa. Muy cómodo y eficiente.",
  },
  {
    name: "Gloria Rojas",
    review:
      "Servicio muy confiable y rápido, tanto para solicitar la orden como para resolver dudas. La atención fue muy amable. Recomiendo Veramed 100%.",
  },
  {
    name: "Natalia Soto",
    review:
      "Excelente atención, muy profesional y rápido. Todo funcionó sin problemas. Recomendadísimo.",
  },
  {
    name: "Catalina Díaz",
    review:
      "Muy buen servicio. La atención online fue excelente, amable y clara para explicar todo. Recibí en minutos mi receta de Ozempic y pude partir el tratamiento al día siguiente. Recomendable 100% Veramed.",
  },
  {
    name: "Paula Riquelme",
    review:
      "En pocos minutos pude obtener la orden para kinesiólogo que buscaba. Muy buena atención y muy agradecida.",
  },
  {
    name: "Josefa Sandoval",
    review: "Excelente iniciativa. El proceso con Veramed además fue fluido de inicio a fin.",
  },
];

function ReviewCard({ name, review }: { name: string; review: string }) {
  return (
    <article className="flex w-[20rem] shrink-0 flex-col rounded-2xl border border-slate-200/90 bg-white px-5 py-5 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.55)] sm:w-[25rem]">
      <h3 className="font-semibold text-slate-950">{name}</h3>
      <p className="mt-1 text-sm tracking-[0.12em] text-amber-500" aria-label="5 de 5 estrellas">
        <span aria-hidden="true">★★★★★</span>
      </p>
      <p className="mt-4 text-sm leading-6 text-slate-700">“{review}”</p>
    </article>
  );
}

export default function ReviewsMarquee() {
  return (
    <section aria-labelledby="experiencias-title" className="border-b border-slate-200/80 bg-emerald-50/45 py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="veramed-kicker">Experiencias en Veramed</p>
            <h2 id="experiencias-title" className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Una experiencia simple, de principio a fin.
            </h2>
          </div>
          <p className="text-xs text-slate-500">Opiniones de personas que usaron Veramed</p>
        </div>
      </div>

      <div className="reviews-marquee mt-7" aria-label="Opiniones sobre la experiencia en Veramed">
        <div className="reviews-marquee-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 gap-4 pr-4" aria-hidden={copy === 1 ? "true" : undefined}>
              {reviews.map((review) => (
                <ReviewCard key={`${copy}-${review.name}`} {...review} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
