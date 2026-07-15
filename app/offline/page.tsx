import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sin conexión — mixmag",
};

/**
 * Static fallback shown by the service worker when a navigation is requested
 * while offline and no cached copy of the page is available.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-semibold">Sin conexión</h1>
      <p className="text-balance text-sm text-neutral-500">
        No tienes conexión a internet en este momento. Vuelve a intentarlo cuando
        recuperes la señal.
      </p>
    </main>
  );
}
