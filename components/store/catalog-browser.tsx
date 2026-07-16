"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProductDto } from "@/modules/catalog/application/dtos/product-dto";
import { DEPARTMENT_ORDER, type DepartmentFilter } from "./departments";
import { DepartmentChips } from "./department-chips";
import { ProductCard } from "./product-card";
import { FeaturedCard } from "./featured-card";
import { ChevronRightIcon } from "./icons";

/** Shared responsive gutter: the mobile app column, widening to the desktop grid. */
const CONTAINER = "mx-auto w-full max-w-[26rem] px-5 md:max-w-6xl md:px-8";

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
}: {
  products: ProductDto[];
  featured: ProductDto[];
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
    <div className="mt-6 md:mt-8">
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
            <SectionHeader title="Destacados" subtitle="Selección destacada" href="/menu" />
            {/* Top padding leaves room for the hero image that bleeds above each
                card; the scroll container's overflow-y would otherwise clip it. */}
            <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pt-8 pb-3 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
              {visibleFeatured.map((product, index) => (
                <FeaturedCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className={`mt-8 md:mt-10 ${CONTAINER}`} aria-label="Más pedidos">
        <SectionHeader title="Más pedidos" href="/menu" />
        <ProductGrid products={visibleProducts} />
      </section>
    </div>
  );
}

/** Responsive product grid: two columns on mobile widening on larger screens. */
function ProductGrid({ products }: { products: ProductDto[] }) {
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
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
}

/**
 * Section title with an optional subtitle and a real "Ver todo" link (accent
 * colour with a chevron, not muted dead text) pointing at the full menu.
 */
function SectionHeader({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle?: string;
  href: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-text md:text-xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>}
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-0.5 rounded-pill py-1 pl-2 text-sm font-semibold text-accent transition-colors hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        Ver todo
        <ChevronRightIcon className="h-4 w-4" />
      </Link>
    </div>
  );
}
