import Link from "next/link";
import type { ProductDto } from "@/modules/catalog/application/dtos/product-dto";
import { formatPrice } from "@/lib/format/money";
import { ProductThumb } from "./product-thumb";
import { PlusIcon } from "./icons";

/*
 * Alternating tonal card surfaces (violet / pink), matching the reference
 * "Most Ordered" grid. Chosen by position parity so the grid reads as a clean
 * checkerboard; falls back to a stable pick when no index is given.
 */
const CARD_TINTS = ["bg-violet-100", "bg-brand-100"] as const;

/**
 * ProductCard is the compact catalog cell used in the storefront grid. It shows
 * the product photo (or its placeholder) floating on a tonal surface, the name,
 * a price pill and a violet add control. A soft pink-tinted shadow gives the
 * card presence against the pale page, and on pointer devices it lifts on hover.
 * The whole card links to the product detail page via a stretched link on the
 * title, while the "+" button stays above it (`z-10`) as an independent control,
 * presentational until the cart module exists.
 */
export function ProductCard({ product, index = 0 }: { product: ProductDto; index?: number }) {
  const tint = CARD_TINTS[index % CARD_TINTS.length];

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-[1.25rem] p-3 shadow-[0_8px_20px_-12px_oklch(0.6_0.14_348/0.3)] transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:-translate-y-1 hover:shadow-card ${tint}`}
    >
      <ProductThumb
        id={product.id}
        name={product.name}
        department={product.department}
        imageUrl={product.imageUrl}
        className="aspect-square w-full"
      />
      <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-text">
        <Link
          href={`/product/${product.id}`}
          className="rounded-sm after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
        >
          {product.name}
        </Link>
      </h3>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="inline-flex h-9 items-center rounded-pill bg-surface px-3 text-xs font-bold tabular-nums text-text shadow-xs">
          {formatPrice(product.priceCents, product.currency)}
        </span>
        <button
          type="button"
          aria-label={`Agregar ${product.name}`}
          className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-cta text-on-cta shadow-cta transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta-strong"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
    </article>
  );
}
