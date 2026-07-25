"use client";

import { useMemo } from "react";
import type { ProductDto } from "@/modules/catalog/application/dtos/product-dto";
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

  const visible = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return products;
    return products.filter(
      (product) =>
        normalize(product.name).includes(term) ||
        normalize(product.description).includes(term)
    );
  }, [products, query]);

  return (
    <section id="catalogo" className={`mt-6 scroll-mt-4 md:mt-8 ${CONTAINER}`}>
      <h2 className="mb-4 text-h-section font-semibold tracking-tight text-text">
        {query.trim() ? "Resultados" : "Productos"}
      </h2>

      {visible.length === 0 ? (
        <EmptyResults query={query} />
      ) : (
        <ul className="grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-4 lg:grid-cols-5 xl:grid-cols-6">
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
