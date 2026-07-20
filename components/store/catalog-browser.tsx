"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProductDto } from "@/modules/catalog/application/dtos/product-dto";
import { DEPARTMENT_ORDER, type DepartmentFilter } from "./departments";
import { DepartmentChips } from "./department-chips";
import { ProductCard } from "./product-card";
import { FeaturedCard } from "./featured-card";
import { Shelf } from "./shelf";
import { CONTAINER } from "./layout";
import { ChevronRightIcon } from "./icons";

/**
 * CatalogBrowser is the client wrapper that owns the department filter and
 * renders the shared, responsive catalog in the reference's two-section shape:
 * a "Destacados" (Top Product) row plus a "Más pedidos" (Most Ordered) grid.
 * It is the single source of the filter state for both horizons — the mobile
 * app column and the wide desktop grid share this one instance, so chip taps
 * filter both instantly without a server round-trip. "Destacados" sits inside a
 * full-bleed tinted band so the page reads as alternating zones with rhythm.
 */
export function CatalogBrowser({
  products,
  featured,
  vesPerUsd = null,
}: {
  products: ProductDto[];
  featured: ProductDto[];
  /** Current BCV rate for bolívar reference prices; `null` hides them. */
  vesPerUsd?: number | null;
}) {
  const [selected, setSelected] = useState<DepartmentFilter>("all");

  // Departments actually present in the data, in canonical order.
  const departments = useMemo(
    () => DEPARTMENT_ORDER.filter((d) => products.some((p) => p.department === d)),
    [products]
  );

  const visibleFeatured =
    selected === "all" ? featured : featured.filter((p) => p.department === selected);
  const visibleProducts =
    selected === "all" ? products : products.filter((p) => p.department === selected);

  return (
    <div id="catalogo" className="mt-6 scroll-mt-4 md:mt-8">
      <div className={CONTAINER}>
        <DepartmentChips
          departments={departments}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      {visibleFeatured.length > 0 && (
        <section
          className="mt-6 bg-accent-subtle py-7 md:mt-8 md:py-9"
          aria-label="Destacados"
        >
          <div className={CONTAINER}>
            <SectionHeader title="Destacados" subtitle="Selección destacada" />
            {/* Top padding leaves room for the hero image that bleeds above each
                card; the scroll container's overflow-y would otherwise clip it. */}
            <Shelf padY="pt-8 pb-3">
              {visibleFeatured.map((product, index) => (
                <FeaturedCard
                  key={product.id}
                  product={product}
                  index={index}
                  vesPerUsd={vesPerUsd}
                />
              ))}
            </Shelf>
          </div>
        </section>
      )}

      <section className={`mt-8 md:mt-10 ${CONTAINER}`} aria-label="Más pedidos">
        <SectionHeader title="Más pedidos" />
        <ProductGrid products={visibleProducts} vesPerUsd={vesPerUsd} />
      </section>
    </div>
  );
}

/**
 * Product shelf: a two-row horizontal carousel on mobile (columns scroll
 * sideways, next column peeking), reflowing into the wide desktop grid from md
 * up. Each card carries `snap-start` so swipes settle on a column.
 */
function ProductGrid({
  products,
  vesPerUsd,
}: {
  products: ProductDto[];
  vesPerUsd: number | null;
}) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-14 text-center">
        <span className="text-3xl" aria-hidden="true">
          🧁
        </span>
        <p className="text-sm font-semibold text-text">Aún no hay productos aquí</p>
        <p className="text-sm text-text-muted">Prueba con otra categoría.</p>
      </div>
    );
  }
  return (
    <Shelf rows={2} padY="py-1">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          index={index}
          className="snap-start"
          vesPerUsd={vesPerUsd}
        />
      ))}
    </Shelf>
  );
}

/**
 * Section title with an optional subtitle and an optional "Ver todo" link (accent
 * colour with a chevron). The link only renders when an `href` is given: the home
 * already shows the whole catalog (filtered by the department chips), so its
 * sections carry no "Ver todo" — the affordance stays available for any future
 * filtered/standalone listing that does need it.
 */
function SectionHeader({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-text md:text-xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-pill py-1 pl-2 text-sm font-semibold text-accent transition-colors hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          Ver todo
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
