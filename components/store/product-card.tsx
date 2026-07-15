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
 * a price pill and a violet add control. The whole card links to the product
 * detail page via a stretched link on the title, while the "+" button stays
 * above it (`z-10`) as an independent control — presentational until the cart
 * module exists.
 */
export function ProductCard({ product, index = 0 }: { product: ProductDto; index?: number }) {
  const tint = CARD_TINTS[index % CARD_TINTS.length];

  return (
    <article className={`relative flex flex-col overflow-hidden rounded-2xl p-3 ${tint}`}>
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
        <span className="rounded-pill bg-surface px-2.5 py-1 text-xs font-bold tabular-nums text-text shadow-xs">
          {formatPrice(product.priceCents, product.currency)}
        </span>
        <button
          type="button"
          aria-label={`Agregar ${product.name}`}
          className="relative z-10 grid h-9 w-9 place-items-center rounded-pill bg-cta text-on-cta shadow-cta transition-transform active:scale-95"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
    </article>
  );
}
