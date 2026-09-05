import type { Metadata } from "next";
import { COLUMN } from "@/components/store/layout";

export const metadata: Metadata = {
  title: "Sin conexión",
};

/**
 * Static fallback shown by the service worker when a navigation is requested
 * while offline and no cached copy of the page is available. It carries the
 * store's own tokens so losing connection does not also look like landing on a
 * different site.
 */
export default function OfflinePage() {
  return (
    <main
      className={`${COLUMN} flex min-h-dvh flex-col items-center justify-center gap-3 text-center`}
    >
      <p className="text-h-section font-bold tracking-tight text-accent">Tu tienda</p>
      <h1 className="text-display font-bold text-text">Sin conexión</h1>
      <p className="text-balance text-body text-text-muted">
        No tienes conexión a internet en este momento. Vuelve a intentarlo cuando recuperes la
        señal.
      </p>
      <a
        href=""
        className="mt-2 inline-flex min-h-11 items-center rounded-pill bg-accent-fill px-5 text-label font-semibold text-on-accent shadow-accent transition-colors hover:bg-accent-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fill focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        Reintentar
      </a>
    </main>
  );
}
