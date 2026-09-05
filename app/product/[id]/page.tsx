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
import { CONTAINER, CONTAINER_READ } from "@/components/store/layout";

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
      images: product.imageUrl ? [product.imageUrl] : [],
    },
    twitter: {
      card: product.imageUrl ? "summary_large_image" : "summary",
      title: product.name,
      description: product.description,
      images: product.imageUrl ? [product.imageUrl] : [],
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
          <div className={`${CONTAINER} mt-4 md:mt-10`}>
            <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] md:gap-12">
              <ProductThumb
                id={product.id}
                name={product.name}
                imageUrl={product.imageUrl}
                priority
                className="aspect-square w-full rounded-3xl border border-border bg-accent-subtle"
                imageClassName="object-contain p-8 md:p-14"
                sizes="(max-width: 768px) 100vw, 620px"
              />

              <div className="md:sticky md:top-28 md:self-start">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-action">Producto fresco</p>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight text-text md:text-5xl">{product.name}</h1>
                    <p className="mt-2 text-2xl font-extrabold tabular-nums text-text md:text-3xl">{price}</p>
                  </div>
                  <PurchaseQuantityStepper className="mt-1 shrink-0" />
                </div>

                <p className="mt-5 max-w-[55ch] text-body leading-relaxed text-text-muted">{product.description}</p>

                <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-surface p-3 text-text"><strong className="block">Selección fresca</strong><span className="text-text-muted">Cuidado en cada pedido</span></div>
                  <div className="rounded-xl bg-surface p-3 text-text"><strong className="block">Compra con beneficios</strong><span className="text-text-muted">Acumula al confirmar</span></div>
                </div>

                {!product.available && (
                  <p className="mt-4 text-body font-medium text-danger">No disponible por ahora.</p>
                )}

                <div className="mt-8 hidden md:block">
                  <AddToCartButton />
                </div>
              </div>
            </div>

            {related.length > 0 && (
              <section className="mt-14 md:mt-20" aria-label="También te puede servir">
                <h2 className="mb-5 font-heading text-2xl font-bold text-text md:text-3xl">
                  También te puede servir
                </h2>
                <ul className="grid grid-cols-2 gap-3 min-[390px]:grid-cols-3 md:grid-cols-4 md:gap-5 xl:grid-cols-6">
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
