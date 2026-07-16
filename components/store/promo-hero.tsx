import Link from "next/link";
import type { ProductDto } from "@/modules/catalog/application/dtos/product-dto";
import { ProductThumb } from "./product-thumb";
import { ChevronRightIcon, ClockIcon } from "./icons";

/**
 * PromoHero is the storefront's top focal anchor: a single wide, deeply rounded
 * brand band that opens the home with identity before the browsing catalog. It
 * spotlights the shop's star product photo (bleeding out of the frame over
 * layered decorative blobs) beside an honest made-to-order tag, a value-prop
 * headline and one solid call to action that scrolls down to the catalog. It is
 * presentational
 * and shared by both horizons: a compact card in the mobile app column and a
 * wider two-column band on desktop, adapting purely by breakpoint. The airy pink
 * surface carries dark ink text (well past AA) while the accent-fill CTA keeps
 * white text on brand-700 (AA) — no white-on-vibrant-pink.
 */
export function PromoHero({ product }: { product: ProductDto }) {
  return (
    <section
      aria-label="Postres por encargo"
      className="relative isolate overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 to-brand-300 px-6 py-7 shadow-card md:px-10 md:py-10"
    >
      {/* Layered decorative blobs: a deep pink glow plus a violet hint of the
          secondary accent, both clipped to the band. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-brand-400/40 blur-2xl" />
        <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-violet-100/70 blur-2xl" />
      </div>

      {/* Star product photo, oversized and bleeding past the right edge. */}
      <div className="pointer-events-none absolute -right-6 top-1/2 h-44 w-44 -translate-y-1/2 drop-shadow-[0_18px_28px_oklch(0.5_0.13_340/0.35)] md:right-6 md:h-72 md:w-72">
        <ProductThumb
          id={product.id}
          name={product.name}
          department={product.department}
          imageUrl={product.imageUrl}
          className="h-full w-full"
          imageClassName="object-contain"
          sizes="(max-width: 768px) 176px, 288px"
        />
      </div>

      <div className="relative max-w-[62%] md:max-w-[56%]">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill bg-surface/80 px-3 py-1 text-xs font-semibold text-brand-800 shadow-xs backdrop-blur-sm">
          <ClockIcon className="h-3.5 w-3.5" />
          Hecho por encargo
        </span>

        <h2 className="mt-3 text-[1.6rem] font-extrabold leading-[1.08] tracking-tight text-text md:mt-4 md:text-4xl">
          Dulces momentos, hechos a tu pedido
        </h2>

        <p className="mt-2 max-w-sm text-sm text-sugar-700 md:text-base">
          Postres artesanales y tu supermercado, en un solo lugar.
        </p>

        <Link
          href="#catalogo"
          className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 rounded-pill bg-accent-fill px-5 text-sm font-semibold text-on-accent shadow-accent transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-brand-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fill focus-visible:ring-offset-2 focus-visible:ring-offset-brand-100 md:mt-6 md:text-base"
        >
          Ver productos
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
