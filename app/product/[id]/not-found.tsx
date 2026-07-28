import Link from "next/link";
import { COLUMN } from "@/components/store/layout";
import { LeafIcon } from "@/components/store/icons";

/**
 * Rendered when a product id has no match (the page calls `notFound()`). Uses
 * the same glyph, container and CTA treatment as the order 404, so the two
 * screens read as one system rather than two.
 */
export default function ProductNotFound() {
  return (
    <main
      className={`${COLUMN} flex min-h-dvh flex-col items-center justify-center gap-3 text-center`}
    >
      <LeafIcon className="h-12 w-12 text-text-muted" />
      <h1 className="text-h-section font-bold text-text">Producto no encontrado</h1>
      <p className="text-body text-text-muted">
        Puede que ya no esté disponible o que el enlace sea incorrecto.
      </p>
      <Link
        href="/loyalty"
        className="mt-2 inline-flex min-h-11 items-center rounded-pill bg-action-fill px-5 text-label font-semibold text-on-action shadow-action transition-[background-color,transform] duration-200 ease-out-quint hover:bg-action-strong active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-fill focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        Volver a la tienda
      </Link>
    </main>
  );
}
