"use client";

import { useMemo, useState } from "react";
import type { ProductDto } from "@/modules/loyalty/catalog/application/dtos/product-dto";
import { ProductCard } from "./product-card";
import { CONTAINER } from "./layout";
import { normalize, useSearch } from "./search-provider";
import { SearchIcon } from "./icons";

/**
 * CatalogBrowser renders the produce grid and applies the live search filter.
 * Grocery shopping is a basket-filling task, not browsing: the grid is dense
 * (three columns on a phone) and every cell can be added to the cart without
 * opening the detail page, so a ten-item basket takes ten taps and no
 * navigation. The whole catalog is already on the client, so filtering is
 * instant.
 */
export function CatalogBrowser({ products }: { products: ProductDto[] }) {
  const { query } = useSearch();
  const [filter, setFilter] = useState<"all" | "featured" | "budget">("all");

  const visible = useMemo(() => {
    const term = normalize(query.trim());
    const searched = !term ? products : products.filter(
      (product) =>
        normalize(product.name).includes(term) ||
        normalize(product.description).includes(term)
    );
    if (filter === "featured") return searched.filter((product) => product.featured);
    if (filter === "budget") return searched.filter((product) => product.priceCents <= 300);
    return searched;
  }, [products, query, filter]);

  return (
    <section id="catalogo" className={`mt-10 scroll-mt-28 md:mt-16 ${CONTAINER}`}>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-caption font-bold uppercase tracking-[0.16em] text-action">
            Selección fresca
          </p>
          <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-text md:text-4xl">
            {query.trim() ? "Resultados" : "Lo mejor para ti"}
          </h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar productos">
          {([
            ["all", "Todos"],
            ["featured", "Destacados"],
            ["budget", "Hasta $3"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`min-h-11 shrink-0 rounded-full px-4 text-label font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                filter === value
                  ? "bg-accent-fill text-on-accent"
                  : "border border-border bg-surface text-text hover:border-accent/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyResults query={query} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 min-[390px]:grid-cols-3 md:grid-cols-4 md:gap-5 xl:grid-cols-6">
          {visible.map((product, index) => (
            <li key={product.id}>
              {/* The first row is above the fold on every viewport: eager-load it
                  so the LCP image is not deferred behind the lazy loader. */}
              <ProductCard product={product} priority={index < 3} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Empty state for a search that matched nothing. */
function EmptyResults({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <SearchIcon className="h-8 w-8 text-text-muted" />
      <p className="text-title font-semibold text-text">Sin resultados</p>
      <p className="max-w-[28ch] text-body text-text-muted">
        No encontramos nada para &ldquo;{query.trim()}&rdquo;. Prueba con otro nombre.
      </p>
    </div>
  );
}
