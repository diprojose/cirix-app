import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth/dal";
import {
  makeGetProductById,
  makeListAvailableProducts,
} from "@/modules/loyalty/catalog/infrastructure/di/catalog-container";
import { formatPrice } from "@/lib/format/money";
import { TopNav } from "@/components/store/top-nav";
import { SiteFooter } from "@/components/store/site-footer";
import { SubHeader } from "@/components/store/sub-header";
import { ProductThumb } from "@/components/store/product-thumb";
import { ProductCard } from "@/components/store/product-card";
import { ShareButton } from "@/components/store/share-button";
import { ProductPurchaseProvider } from "@/components/cart/product-purchase-provider";
import { PurchaseQuantityStepper } from "@/components/cart/purchase-quantity-stepper";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { CONTAINER_READ } from "@/components/store/layout";

type PageProps = { params: Promise<{ id: string }> };

// Most related products to show under the detail ("También te puede servir").
const MAX_RELATED = 6;

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
 * `GetProductById` on the server and maps a not-found failure to Next's
 * `notFound()` boundary.
 *
 * The page shows only what the domain actually models: photo, name, price,
 * description, quantity and the add control. A previous version carried a
 * "15-20 min · Entrega" chip and a "4.8 (12k) · Valoración" chip, plus a
 * tagline about artisan bakers appended to every description. None of that was
 * real data, and a fabricated rating on a storefront is a trust problem rather
 * than a styling one, so it is gone.
 */
export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [viewer, productResult, availableResult] = await Promise.all([
    getViewer(),
    makeGetProductById().execute(id),
    makeListAvailableProducts().execute(),
  ]);

  if (!productResult.ok) {
    notFound();
  }

  const product = productResult.value;
  const price = formatPrice(product.priceCents, product.currency);
  const related = (availableResult.ok ? availableResult.value : [])
    .filter((p) => p.id !== product.id)
    .slice(0, MAX_RELATED);

  return (
    <ProductPurchaseProvider product={product}>
      <div className="flex min-h-dvh flex-col bg-bg">
        <TopNav viewer={viewer} />
        <SubHeader title="Detalle" action={<ShareButton title={product.name} />} />

        <main className="flex-1 pb-28 md:pb-12">
          <div className={`${CONTAINER_READ} mt-4`}>
            <ProductThumb
              id={product.id}
              name={product.name}
              imageUrl={product.imageUrl}
              priority
              className="aspect-square w-full rounded-xl bg-accent-subtle"
              sizes="(max-width: 768px) 100vw, 640px"
            />

            <div className="mt-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-display font-bold text-text">{product.name}</h2>
                <p className="mt-1 text-price-lg font-bold tabular-nums text-text">{price}</p>
              </div>
              <PurchaseQuantityStepper className="mt-1 shrink-0" />
            </div>

            <p className="mt-4 max-w-[65ch] text-body text-text-muted">{product.description}</p>

            {!product.available && (
              <p className="mt-4 text-body font-medium text-danger">No disponible por ahora.</p>
            )}

            {/* Desktop inline CTA; mobile uses the fixed bottom bar below. */}
            <div className="mt-8 hidden md:block">
              <AddToCartButton />
            </div>

            {related.length > 0 && (
              <section className="mt-12" aria-label="También te puede servir">
                <h2 className="mb-4 text-h-section font-semibold text-text">
                  También te puede servir
                </h2>
                <ul className="grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-4">
                  {related.map((p) => (
                    <li key={p.id}>
                      <ProductCard product={p} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </main>

        <SiteFooter />

        {/* Mobile: fixed "Agregar al carrito" CTA fading into the page. */}
        <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-bg via-bg to-transparent pt-6 md:hidden">
          <div className={`${CONTAINER_READ} pb-[calc(env(safe-area-inset-bottom)+0.75rem)]`}>
            <AddToCartButton />
          </div>
        </div>
      </div>
    </ProductPurchaseProvider>
  );
}
