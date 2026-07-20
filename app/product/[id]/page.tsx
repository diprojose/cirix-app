import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth/dal";
import {
  makeGetProductById,
  makeListAvailableProducts,
} from "@/modules/catalog/infrastructure/di/catalog-container";
import { formatPrice, formatVes } from "@/lib/format/money";
import { makeGetExchangeRate } from "@/modules/pricing/infrastructure/di/pricing-container";
import { TopNav } from "@/components/store/top-nav";
import { SiteFooter } from "@/components/store/site-footer";
import { ProductThumb } from "@/components/store/product-thumb";
import { ProductCard } from "@/components/store/product-card";
import { BackButton } from "@/components/store/back-button";
import { ShareButton } from "@/components/store/share-button";
import { ProductPurchaseProvider } from "@/components/cart/product-purchase-provider";
import { PurchaseQuantityStepper } from "@/components/cart/purchase-quantity-stepper";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ExpandableText } from "@/components/store/expandable-text";
import { IngredientsRow } from "@/components/store/ingredients-row";
import { departmentLabel } from "@/components/store/departments";

type PageProps = { params: Promise<{ id: string }> };

// Most related products to show under the ficha ("Más de <departamento>").
const MAX_RELATED = 6;

// Example copy appended to the description so the "Leer más" affordance has
// something to reveal (the domain carries only a short description).
const EXAMPLE_TAGLINE =
  "Preparado de forma artesanal por nuestros pasteleros, con ingredientes seleccionados para cada pedido.";

/**
 * Per-product metadata for tabs, sharing and SEO. Runs the same use case as the
 * page; a missing product yields a minimal title (the page itself renders the
 * 404). Next 16 delivers route params as a promise, so they are awaited.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await makeGetProductById().execute(id);
  if (!result.ok) {
    return { title: "Producto no encontrado" };
  }
  const product = result.value;
  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      ...(product.imageUrl ? { images: [product.imageUrl] } : {}),
    },
  };
}

/**
 * Product detail page: the catalog's per-item driving (primary) adapter. It runs
 * the `GetProductById` use case on the server, maps a not-found failure to
 * Next's `notFound()` boundary, and renders the reference "Details" layout —
 * top bar (back · Detalles · compartir), floating hero with a price badge,
 * name + quantity, delivery/rating chips, description, ingredients and a violet
 * "Agregar al carrito" CTA. Everything below the use case is plain DTOs; no
 * domain or infrastructure types cross into the view.
 */
export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [viewer, productResult, availableResult, rateResult] = await Promise.all([
    getViewer(),
    makeGetProductById().execute(id),
    makeListAvailableProducts().execute(),
    makeGetExchangeRate().execute(),
  ]);

  if (!productResult.ok) {
    notFound();
  }

  const product = productResult.value;
  const department = departmentLabel(product.department);
  const price = formatPrice(product.priceCents, product.currency);
  const vesPerUsd = rateResult.ok ? rateResult.value.vesPerUsd : null;
  const related = (availableResult.ok ? availableResult.value : [])
    .filter((p) => p.department === product.department && p.id !== product.id)
    .slice(0, MAX_RELATED);

  return (
    <ProductPurchaseProvider product={product}>
    <div className="flex min-h-dvh flex-col bg-bg">
      {/* Desktop / web horizon: top navigation bar (hidden below md). */}
      <TopNav viewer={viewer} />

      {/* Mobile / PWA horizon: top bar — back · Detalles · compartir. */}
      <div className="mx-auto flex w-full max-w-[26rem] items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:hidden">
        <BackButton />
        <p className="flex-1 text-center text-base font-semibold text-text">Detalles</p>
        <ShareButton title={product.name} />
      </div>

      <main className="flex-1 pb-28 md:pb-12">
        <div className="mx-auto w-full max-w-[26rem] px-5 md:max-w-md">
          {/* Floating hero image with an overlapping price badge. */}
          <div className="relative mt-3">
            <ProductThumb
              id={product.id}
              name={product.name}
              department={product.department}
              imageUrl={product.imageUrl}
              className="aspect-square w-full"
              sizes="(max-width: 768px) 100vw, 420px"
            />
            <div className="absolute right-0 top-8 rounded-2xl bg-surface px-4 py-2.5 text-center shadow-float">
              <p className="text-[11px] font-medium text-text-muted">Precio</p>
              <p className="text-xl font-extrabold tabular-nums text-text">{price}</p>
              {vesPerUsd !== null && (
                <p className="text-xs font-medium tabular-nums text-text-muted">
                  {formatVes(product.priceCents, vesPerUsd)}
                </p>
              )}
            </div>
          </div>

          {/* Name + quantity stepper on one row. */}
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight text-text">{product.name}</h1>
              <p className="mt-0.5 text-sm text-text-muted">{department}</p>
            </div>
            <PurchaseQuantityStepper className="mt-1 shrink-0" />
          </div>

          {/* Delivery / rating chips (example content — not modelled yet). */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
              <span className="text-2xl" aria-hidden="true">
                🛵
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold text-text">15-20 min</p>
                <p className="text-xs text-text-muted">Entrega</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
              <span className="text-2xl" aria-hidden="true">
                🏅
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold text-text">
                  4.8 <span className="text-xs font-normal text-text-muted">(12k)</span>
                </p>
                <p className="text-xs text-text-muted">Valoración</p>
              </div>
            </div>
          </div>

          {/* Description with a "Leer más" toggle. */}
          <div className="mt-5">
            <ExpandableText text={`${product.description} ${EXAMPLE_TAGLINE}`} />
          </div>

          {/* Ingredients (example thumbnails). */}
          <section className="mt-6" aria-label="Ingredientes">
            <h2 className="mb-3 text-lg font-bold text-text">Ingredientes</h2>
            <IngredientsRow />
          </section>

          {/* Desktop inline CTA; mobile uses the fixed bottom bar below. */}
          <div className="mt-8 hidden md:block">
            <AddToCartButton />
            {!product.available && (
              <p className="mt-2 text-sm font-medium text-danger">No disponible por ahora.</p>
            )}
          </div>

          {/* Related products from the same department. */}
          {related.length > 0 && (
            <section className="mt-10" aria-label={`Más de ${department}`}>
              <h2 className="mb-3 text-lg font-bold text-text">Más de {department}</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {related.map((p, index) => (
                  <ProductCard key={p.id} product={p} index={index} vesPerUsd={vesPerUsd} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Desktop / web horizon: footer. */}
      <SiteFooter />

      {/* Mobile / PWA horizon: fixed "Agregar al carrito" CTA (fades into page). */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-bg via-bg to-transparent pt-6 md:hidden">
        <div className="mx-auto w-full max-w-[26rem] px-5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <AddToCartButton />
        </div>
      </div>
    </div>
    </ProductPurchaseProvider>
  );
}
