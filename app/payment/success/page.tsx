import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }
  return typeof value === "string" ? value.trim() : "";
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolved = await searchParams;
  const orderId = getSingleParam(resolved.orderId);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Pago confirmado
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-emerald-900">
          Tu pago fue aprobado
        </h1>
        <p className="mt-2 text-sm text-emerald-900/80">
          La validación clínica continuará según el flujo de tu solicitud.
        </p>
        {orderId ? (
          <p className="mt-4 text-sm text-emerald-900/90">
            Orden de referencia: <span className="font-semibold">{orderId}</span>
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/mi-cuenta"
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
          >
            Ir a mi cuenta
          </Link>
          <Link
            href="/"
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}

