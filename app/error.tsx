"use client";

import { useEffect } from "react";
import { ErrorToast } from "@/components/toast-provider";
import { useLocale } from "@/components/locale-provider";
import { pick } from "@/lib/locale";

export default function ErrorPage({ error, unstable_retry }: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const locale = useLocale();
  useEffect(() => { console.error(error); }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <ErrorToast key={error.digest ?? error.message} message={pick(locale, {
        es: "No se pudo cargar esta página. Intenta de nuevo.",
        en: "Could not load this page. Please try again.",
      })} />
      <h1 className="text-display font-semibold">{pick(locale, { es: "Retoma tu actividad", en: "Get back to your work" })}</h1>
      <button type="button" onClick={unstable_retry} className="min-h-11 rounded-pill bg-accent-fill px-6 py-3 font-medium text-on-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
        {pick(locale, { es: "Reintentar", en: "Try again" })}
      </button>
    </main>
  );
}
