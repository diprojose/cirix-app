import type { ProductDto } from "@/modules/catalog/application/dtos/product-dto";
import { formatPrice } from "@/lib/format/money";
import { departmentLabel } from "./departments";
import { ProductThumb } from "./product-thumb";
import { HeartIcon } from "./icons";

/**
 * FeaturedCard is the highlighted, tonal card for promoted products. It is
 * deliberately different from {@link ProductCard} (wider, `accent-soft` surface,
 * a decorative blob, larger type) so the "Destacados" row does not read as more
 * of the same grid. Its actions are presentational until the cart exists.
 */
export function FeaturedCard({ product }: { product: ProductDto }) {
  return (
    <article className="relative flex w-[17rem] shrink-0 snap-start items-stretch gap-3 overflow-hidden rounded-xl bg-accent-soft p-4">
      {/* Decorative blob — purely visual, kept behind the content. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-200/60"
      />
      <div className="relative z-10 flex flex-1 flex-col">
        <span className="text-xs font-medium uppercase tracking-wide text-accent-strong">
          {departmentLabel(product.department)} · Destacado
        </span>
        <h3 className="mt-1 line-clamp-2 text-lg font-bold leading-tight text-text">
          {product.name}
        </h3>
        <span className="mt-1 text-base font-bold tabular-nums text-text">
          {formatPrice(product.priceCents, product.currency)}
        </span>
        <div className="mt-auto flex items-center gap-2 pt-3">
          <button
            type="button"
            className="rounded-pill bg-surface px-4 py-2 text-sm font-medium text-ink shadow-card transition-transform active:scale-95"
          >
            Agregar
          </button>
          <button
            type="button"
            aria-label={`Guardar ${product.name} en favoritos`}
            className="grid h-11 w-11 place-items-center rounded-pill bg-surface text-accent shadow-card transition-transform active:scale-95"
          >
            <HeartIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      <ProductThumb
        id={product.id}
        name={product.name}
        department={product.department}
        imageUrl={product.imageUrl}
        className="relative z-10 h-24 w-24 self-center rounded-lg bg-white/70"
        sizes="96px"
      />
    </article>
  );
}
