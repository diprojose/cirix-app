"use client";

import { useMemo, useState } from "react";
import type { ProductDto } from "@/modules/catalog/application/dtos/product-dto";
import type { DepartmentName } from "@/modules/catalog/domain/value-objects/department";
import {
  DEPARTMENT_ORDER,
  departmentLabel,
  type DepartmentFilter,
} from "./departments";
import { DepartmentChips } from "./department-chips";
import { ProductCard } from "./product-card";
import { FeaturedCard } from "./featured-card";

/**
 * CatalogBrowser is the client wrapper that owns the department filter and
 * renders the shared, responsive catalog: a "Destacados" row plus the product
 * grid. It is the single source of the filter state for both horizons — the
 * mobile app column and the wide desktop grid share this one instance, so
 * chip taps filter instantly without a server round-trip.
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

  return (
    <div className="mx-auto w-full max-w-[26rem] px-5 md:max-w-6xl md:px-8">
      <DepartmentChips
        departments={departments}
        selected={selected}
        onSelect={setSelected}
      />

      {visibleFeatured.length > 0 && (
        <section className="mt-4" aria-label="Destacados">
          <SectionHeader title="Destacados" />
          <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
            {visibleFeatured.map((product) => (
              <FeaturedCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {selected === "all" ? (
        departments.map((department) => (
          <DepartmentSection
            key={department}
            department={department}
            products={products.filter((p) => p.department === department)}
          />
        ))
      ) : (
        <section className="mt-4">
          <SectionHeader title={departmentLabel(selected)} />
          <ProductGrid products={products.filter((p) => p.department === selected)} />
        </section>
      )}
    </div>
  );
}

/** One department block: its header plus the grid of its products. */
function DepartmentSection({
  department,
  products,
}: {
  department: DepartmentName;
  products: ProductDto[];
}) {
  if (products.length === 0) return null;
  return (
    <section className="mt-4">
      <SectionHeader title={departmentLabel(department)} />
      <ProductGrid products={products} />
    </section>
  );
}

/** Responsive product grid: two columns on mobile widening on larger screens. */
function ProductGrid({ products }: { products: ProductDto[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

/** Section title with a muted "Ver todo" affordance (presentational). */
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-lg font-semibold tracking-tight text-text">{title}</h2>
      <span className="text-sm font-medium text-accent">Ver todo</span>
    </div>
  );
}
