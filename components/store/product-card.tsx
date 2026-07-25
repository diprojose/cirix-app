import Link from "next/link";
import type { ProductDto } from "@/modules/catalog/application/dtos/product-dto";
import { formatPrice } from "@/lib/format/money";
import { QuickAddButton } from "@/components/cart/quick-add-button";
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
      className={`relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface p-2 transition-[transform,box-shadow] duration-200 ease-out-quint hover:shadow-card motion-safe:hover:-translate-y-0.5 ${className}`}
    >
      <ProductThumb
        id={product.id}
        name={product.name}
        imageUrl={product.imageUrl}
        priority={priority}
        className="aspect-square w-full rounded-md bg-accent-subtle"
        sizes="(max-width: 768px) 33vw, 180px"
      />

      <h3 className="mt-2 line-clamp-2 text-label font-semibold leading-snug text-text">
        <Link
          href={`/product/${product.id}`}
          className="rounded-sm after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {product.name}
        </Link>
      </h3>

      <div className="mt-auto flex items-center justify-between gap-1 pt-2">
        <span className="min-w-0 truncate text-label font-bold tabular-nums text-text">
          {formatPrice(product.priceCents, product.currency)}
        </span>
        <QuickAddButton product={product} />
      </div>
    </article>
  );
}
