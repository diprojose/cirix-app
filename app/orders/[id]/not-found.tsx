import Link from "next/link";
import { COLUMN } from "@/components/store/layout";
import { BagIcon } from "@/components/store/icons";

/**
 * Shown when an order id does not exist (mistyped or stale link). Matches the
 * product 404 exactly: same container, same glyph treatment, same CTA.
 */
export default function OrderNotFound() {
  return (
    <main
      className={`${COLUMN} flex min-h-dvh flex-col items-center justify-center gap-3 text-center`}
    >
      <BagIcon className="h-12 w-12 text-text-muted" />
      <h1 className="text-h-section font-bold text-text">Pedido no encontrado</h1>
      <p className="text-body text-text-muted">
        El enlace no corresponde a ningún pedido. Revisa el enlace que recibiste.
      </p>
      <Link
        href="/loyalty"
        className="mt-2 inline-flex min-h-11 items-center rounded-pill bg-action-fill px-5 text-label font-semibold text-on-action shadow-action transition-[background-color,transform] duration-200 ease-out-quint hover:bg-action-fill-strong active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-fill focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        Volver a la tienda
      </Link>
    </main>
  );
}
