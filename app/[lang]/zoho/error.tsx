"use client";

import { useEffect } from "react";
import { CONTAINER_READ } from "@/components/store/layout";

export default function LocalizedZohoError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={`${CONTAINER_READ} flex min-h-[24rem] flex-col items-center justify-center gap-4 text-center`}>
      <div className="space-y-2">
        <p className="text-title font-semibold text-text">No se pudo cargar el modulo CRM.</p>
        <p className="text-body text-text-muted">Intenta de nuevo. Si persiste, revisa la configuracion de Zoho.</p>
      </div>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="rounded-pill bg-accent-fill px-5 py-2 text-label font-semibold text-on-accent shadow-accent transition hover:bg-accent-strong"
      >
        Reintentar
      </button>
    </main>
  );
}
