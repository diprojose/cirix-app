import Link from "next/link";
import type { ProductDto } from "@/modules/catalog/application/dtos/product-dto";
import { formatPrice } from "@/lib/format/money";
import { departmentLabel } from "./departments";
import { ProductThumb } from "./product-thumb";
import { HeartIcon } from "./icons";

/**
 * FeaturedCard is the large, tonal "Top Product" hero for promoted products. It
 * is deliberately different from {@link ProductCard}: a near full-width pink
 * `accent-soft` card with a violet decorative shape, a display-size name and a
 * big floating image on top, and a wide "Agregar" action plus a heart across the
 * bottom — mirroring the reference hero. A stretched link on the title opens the
 * detail page; the action buttons stay above it (`z-10`). Presentational until
 * the cart exists.
 */
export function FeaturedCard({ product }: { product: ProductDto }) {
  return (
    <article className="relative flex w-[19.5rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-accent-soft p-5">
      {/* Violet decorative shape behind the image — purely visual. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 top-2 h-40 w-40 rounded-full bg-cta/15"
      />

      {/* Top: name/price on the left, big floating image on the right. */}
      <div className="flex items-start gap-2">
        <div className="relative z-10 flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-accent-strong">
            {departmentLabel(product.department)} · Destacado
          </span>
          <h3 className="mt-1 line-clamp-2 text-2xl font-extrabold leading-tight text-text">
            <Link
              href={`/product/${product.id}`}
              className="rounded-sm after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {product.name}
            </Link>
          </h3>
          <span className="mt-2 block text-lg font-bold tabular-nums text-text">
            {formatPrice(product.priceCents, product.currency)}
          </span>
        </div>
        <ProductThumb
          id={product.id}
          name={product.name}
          department={product.department}
          imageUrl={product.imageUrl}
          className="relative z-10 h-28 w-28 shrink-0 self-start"
          sizes="112px"
        />
      </div>

      {/* Bottom: wide "Agregar" spanning the card, heart beside it. */}
      <div className="relative z-10 mt-4 flex items-center gap-2">
        <button
          type="button"
          className="flex-1 rounded-pill bg-surface py-3 text-sm font-semibold text-ink shadow-card transition-transform active:scale-95"
        >
          Agregar
        </button>
        <button
          type="button"
          aria-label={`Guardar ${product.name} en favoritos`}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-pill bg-surface text-accent shadow-card transition-transform active:scale-95"
        >
          <HeartIcon className="h-5 w-5" />
        </button>
      </div>
    </article>
  );
}
