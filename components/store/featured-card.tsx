import Link from "next/link";
import type { ProductDto } from "@/modules/catalog/application/dtos/product-dto";
import { formatPrice } from "@/lib/format/money";
import { departmentLabel } from "./departments";
import { ProductThumb } from "./product-thumb";
import { HeartIcon } from "./icons";

/**
 * FeaturedCard is the large, tonal "Top Product" hero for promoted products. It
 * is deliberately different from {@link ProductCard}: a wide, deeply rounded card
 * whose product image is oversized and bleeds past the top-right edge (the card
 * itself does not clip, so a sibling layer clips the decorative blob instead).
 * The `index` alternates the tint pink/violet so carousel neighbours read violet,
 * mirroring the reference. A stretched link on the title opens the detail page;
 * the action buttons and text paint above the image (later in the DOM at `z-10`).
 * A pink-tinted card shadow plus a desktop hover lift give it presence; the tag
 * uses a deep, AA-safe ink so it stays legible on the soft surface.
 * Presentational until the cart exists.
 */
export function FeaturedCard({
  product,
  index = 0,
}: {
  product: ProductDto;
  index?: number;
}) {
  const violet = index % 2 === 1;
  const surface = violet ? "bg-violet-100" : "bg-accent-soft";
  const blob = violet ? "bg-cta/20" : "bg-accent/20";
  const tag = violet ? "text-cta-strong" : "text-brand-800";

  return (
    <article
      className={`relative flex h-56 w-[19.5rem] shrink-0 snap-start flex-col justify-between rounded-[2rem] p-6 shadow-card transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:-translate-y-1 hover:shadow-float ${surface}`}
    >
      {/* Decorative blob, clipped to the card so only the image bleeds out. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]"
      >
        <div className={`absolute -right-8 top-8 h-44 w-44 rounded-full ${blob}`} />
      </div>

      {/* Product image, bleeding past the top-right edge (not clipped). Sized and
          placed to sit in the top-right corner clear of the title column. */}
      <div className="pointer-events-none absolute -right-3 -top-5 z-0 h-36 w-36 drop-shadow-[0_16px_24px_oklch(0.5_0.13_340/0.32)]">
        <ProductThumb
          id={product.id}
          name={product.name}
          department={product.department}
          imageUrl={product.imageUrl}
          className="h-full w-full"
          imageClassName="object-contain"
          sizes="144px"
        />
      </div>

      {/* Top-left: tag + display title + price, in a fixed column that never
          underlaps the image. */}
      <div className="relative z-10 max-w-[9.5rem]">
        <span className={`text-xs font-semibold ${tag}`}>
          {departmentLabel(product.department)}
        </span>
        <h3 className="mt-1 line-clamp-2 text-[1.5rem] font-extrabold leading-[1.12] text-text">
          <Link
            href={`/product/${product.id}`}
            className="rounded-sm after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fill focus-visible:ring-offset-2 focus-visible:ring-offset-accent-soft"
          >
            {product.name}
          </Link>
        </h3>
        <span className="mt-2 block text-xl font-bold tabular-nums text-text">
          {formatPrice(product.priceCents, product.currency)}
        </span>
      </div>

      {/* Bottom: wide "Agregar" spanning the card, heart beside it. */}
      <div className="relative z-10 flex items-center gap-2">
        <button
          type="button"
          className="flex-1 rounded-pill bg-surface py-3 text-sm font-semibold text-ink shadow-card transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-fill"
        >
          Agregar
        </button>
        <button
          type="button"
          aria-label={`Guardar ${product.name} en favoritos`}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-pill bg-surface text-accent shadow-card transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 hover:text-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-fill"
        >
          <HeartIcon className="h-5 w-5" />
        </button>
      </div>
    </article>
  );
}
