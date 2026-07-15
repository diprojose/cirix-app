import Link from "next/link";

/**
 * Rendered when a product id has no match (the page calls `notFound()`). Keeps
 * the brand's bright, centered tone and offers a single way back to the store.
 */
export default function ProductNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[26rem] flex-col items-center justify-center gap-3 px-5 text-center">
      <span className="text-5xl" aria-hidden="true">
        🧁
      </span>
      <h1 className="text-lg font-semibold text-text">Producto no encontrado</h1>
      <p className="text-sm text-text-muted">
        Puede que ya no esté disponible o que el enlace sea incorrecto.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-pill bg-accent-fill px-5 py-2.5 text-sm font-medium text-on-accent shadow-accent transition-transform active:scale-95"
      >
        Volver a la tienda
      </Link>
    </main>
  );
}
