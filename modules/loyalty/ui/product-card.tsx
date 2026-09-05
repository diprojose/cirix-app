import type { ProductDto } from "@/modules/loyalty/catalog/application/dtos/product-dto";
import { formatPrice } from "@/lib/format/money";
import { QuickAddButton } from "@/components/cart/quick-add-button";
import { LocalizedLink } from "@/components/localized-link";
import { ProductThumb } from "./product-thumb";

/**
 * ProductCard is the catalog cell. It is deliberately plain: a white surface
 * with a hairline border, because the produce photography supplies all the
 * colour the grid needs. Three of these fit across a phone, and the add control
 * lives in the card itself, so building a twenty-item basket never leaves the
 * grid.
 *
 * The name carries a stretched link to the detail page while the add control
 * sits above it (`z-10`) as an independent target, so tapping "+" never
 * navigates.
 */
export function ProductCard({
  product,
  className = "",
  priority = false,
}: {
  product: ProductDto;
  className?: string;
  /** Eager-loads the image; set on the first row so the LCP is not deferred. */
  priority?: boolean;
}) {
  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface p-2.5 transition-[transform,box-shadow,border-color] duration-200 ease-out-quint hover:border-accent/30 hover:shadow-card motion-safe:hover:-translate-y-0.5 ${className}`}
    >
      <ProductThumb
        id={product.id}
        name={product.name}
        imageUrl={product.imageUrl}
        priority={priority}
        className="aspect-[1.08/1] w-full rounded-xl bg-accent-subtle"
        sizes="(max-width: 768px) 33vw, 180px"
      />

      <p className="mt-2 text-[0.65rem] font-medium uppercase tracking-[0.08em] text-text-muted">
        Fresco
      </p>
      <h3 className="mt-1 line-clamp-2 min-h-9 text-label font-semibold leading-snug text-text">
        <LocalizedLink
          href={`/product/${product.id}`}
          className="rounded-sm after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {product.name}
        </LocalizedLink>
      </h3>

      <div className="mt-auto flex items-center justify-between gap-1 pt-2">
        <span className="min-w-0 truncate text-title font-extrabold tabular-nums text-text">
          {formatPrice(product.priceCents, product.currency)}
        </span>
        <QuickAddButton product={product} />
      </div>
    </article>
  );
}
