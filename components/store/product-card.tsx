import type { ProductDto } from "@/modules/catalog/application/dtos/product-dto";
import { formatPrice } from "@/lib/format/money";
import { ProductThumb } from "./product-thumb";
import { PlusIcon } from "./icons";

/**
 * ProductCard is the compact catalog cell used in the storefront grid. It shows
 * the product photo (or its placeholder), name, price pill and an add control.
 * The "+" button is presentational for now — the cart module is not built yet —
 * but keeps its pressed micro-interaction so the flow feels alive.
 */
export function ProductCard({ product }: { product: ProductDto }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg bg-surface shadow-card">
      <ProductThumb
        id={product.id}
        name={product.name}
        department={product.department}
        imageUrl={product.imageUrl}
        className="aspect-square w-full bg-sugar-50"
      />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-text">
          {product.name}
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="rounded-sm bg-accent-soft px-2.5 py-1 text-xs font-medium tabular-nums text-text">
            {formatPrice(product.priceCents, product.currency)}
          </span>
          <button
            type="button"
            aria-label={`Agregar ${product.name}`}
            className="grid h-9 w-9 place-items-center rounded-pill bg-accent-fill text-on-accent shadow-accent transition-transform active:scale-95"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </article>
  );
}
