import Link from "next/link";

const reasonLabel: Record<string, string> = {
  rejected: "La transacción fue rechazada por Webpay.",
  "flow-aborted": "El flujo de pago fue cancelado antes de confirmar.",
  "commit-failed": "No pudimos confirmar el pago en este momento.",
  "missing-token": "No recibimos el token de la transacción.",
  "invalid-body": "No recibimos una respuesta válida del retorno de pago.",
  "network-error": "Hubo un problema de conexión al confirmar el pago.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }
  return typeof value === "string" ? value.trim() : "";
}

export default async function PaymentErrorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolved = await searchParams;
  const orderId = getSingleParam(resolved.orderId);
  const reason = getSingleParam(resolved.reason);
  const tokenWs = getSingleParam(resolved.token_ws);
  const detail = getSingleParam(resolved.detail);
  const label = reasonLabel[reason] ?? "No pudimos completar la confirmación del pago.";

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
          Pago no confirmado
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-red-900">
          No fue posible completar tu pago
        </h1>
        <p className="mt-3 text-sm text-red-900/80">{label}</p>
        {detail ? (
          <p className="mt-2 text-xs text-red-700/90">
            Detalle técnico: <span className="font-mono">{detail}</span>
          </p>
        ) : null}
        {orderId ? (
          <p className="mt-4 text-sm text-red-900/90">
            Orden de referencia: <span className="font-semibold">{orderId}</span>
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          {reason === "commit-failed" && tokenWs ? (
            <Link
              href={`/payments/transbank/return?token_ws=${encodeURIComponent(tokenWs)}`}
              className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white"
            >
              Reintentar confirmación
            </Link>
          ) : null}
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
