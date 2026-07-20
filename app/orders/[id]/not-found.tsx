import Link from "next/link";

/**
 * Shown when an order id does not exist (mistyped or stale link). Kept minimal:
 * a message and a way back to the store.
 */
export default function OrderNotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-5xl" aria-hidden="true">
          🧾
        </p>
        <h1 className="text-xl font-bold text-text">Pedido no encontrado</h1>
        <p className="text-sm text-text-muted">
          El enlace no corresponde a ningún pedido. Revisa el enlace que recibiste.
        </p>
        <Link
          href="/"
          className="flex h-12 items-center justify-center rounded-pill bg-gradient-to-r from-cta to-cta-strong px-6 text-sm font-semibold text-on-cta shadow-cta transition-transform active:scale-[0.98]"
        >
          Volver a la tienda
        </Link>
      </div>
    </main>
  );
}
