"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginWithEmail } from "@/lib/auth-api";

export default function LoginPage() {
  return <Suspense fallback={<main className="veramed-page p-8">Cargando inicio de sesión…</main>}><LoginForm /></Suspense>;
}

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: "No pudimos conectar con Google. Inténtalo nuevamente; si persiste, puedes ingresar con tu correo y contraseña.",
  OAuthCallback: "No pudimos completar la respuesta de Google. Vuelve a iniciar sesión desde esta página.",
  OAuthAccountNotLinked: "No pudimos vincular esa cuenta. Ingresa con tu correo y contraseña.",
  AccessDenied: "El acceso con Google no fue autorizado. Puedes reintentar o ingresar con tu correo.",
  Configuration: "El inicio de sesión con Google no está disponible en este momento. Puedes ingresar con tu correo y contraseña.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const providerError = GOOGLE_ERROR_MESSAGES[searchParams.get("error") || ""] || "";
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleSignIn() {
    if (googleSubmitting) return;
    setGoogleSubmitting(true);
    setError("");
    try {
      const providers = await getProviders();
      if (!providers?.google) {
        throw new Error(GOOGLE_ERROR_MESSAGES.Configuration);
      }
      // NextAuth obtains the CSRF cookie/token and POSTs to the provider endpoint.
      await signIn("google", { callbackUrl: "/auth/google/complete" });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : GOOGLE_ERROR_MESSAGES.OAuthSignin);
      setGoogleSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");
      await loginWithEmail({ email, password });
      router.push("/mi-cuenta");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No pudimos iniciar sesión.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="veramed-page min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-xl px-6 py-12">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.45)]">
          <div className="mb-2 flex justify-end">
            <Image
              src="/brand/veramed-icon.png"
              alt="Veramed"
              width={44}
              height={44}
              className="h-11 w-11"
              priority
            />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Cuenta Veramed
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Iniciar sesión
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Accede a tu cuenta para continuar tus solicitudes y revisar tu información.
          </p>

          <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
            <Field label="Correo electrónico">
              <input
                className={inputCls}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field label="Contraseña">
              <input
                className={inputCls}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            <div className="-mt-2 text-right">
              <Link href="/recuperar-contrasena" className="text-xs font-semibold text-slate-700 underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </button>

            {(error || providerError) && <p role="alert" className="text-sm text-rose-600">{error || providerError}</p>}
          </form>

          <div className="mt-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleSubmitting || isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold">
                G
              </span>
              {googleSubmitting ? "Conectando con Google…" : "Continuar con Google"}
            </button>
          </div>

          <p className="mt-6 text-sm text-slate-600">
            ¿Todavía no tienes cuenta?{" "}
            <Link href="/crear-cuenta" className="font-semibold text-slate-900 underline">
              Crea una aquí
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-900">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
