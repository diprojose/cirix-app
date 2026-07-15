import { getViewer } from "@/lib/auth/dal";
import {
  makeListAvailableProducts,
  makeListFeaturedProducts,
} from "@/modules/catalog/infrastructure/di/catalog-container";
import { TopNav } from "@/components/store/top-nav";
import { HomeHeader } from "@/components/store/home-header";
import { SearchBar } from "@/components/store/search-bar";
import { CatalogBrowser } from "@/components/store/catalog-browser";
import { BottomNav } from "@/components/store/bottom-nav";
import { SiteFooter } from "@/components/store/site-footer";

/**
 * Home is the public storefront and the catalog's primary (driving) adapter. It
 * resolves the viewer (without redirecting) and the available/featured products
 * on the server, then renders two responsive horizons from one URL: the mobile
 * PWA app design (app header, search, floating BottomNav) and the desktop web
 * layout (TopNav + wide grid + footer). Both share the same catalog primitives
 * and a single client-side department filter.
 */
export default async function Home() {
  const [viewer, productsResult, featuredResult] = await Promise.all([
    getViewer(),
    makeListAvailableProducts().execute(),
    makeListFeaturedProducts().execute(),
  ]);

  if (!productsResult.ok) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-[26rem] flex-col items-center justify-center gap-2 px-5 text-center">
        <p className="text-base font-semibold text-text">No se pudo cargar la tienda.</p>
        <p className="text-sm text-text-muted">Vuelve a intentarlo en un momento.</p>
      </main>
    );
  }

  const products = productsResult.value;
  const featured = featuredResult.ok ? featuredResult.value : [];

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {/* Desktop / web horizon: top navigation bar (hidden below md). */}
      <TopNav viewer={viewer} />

      {/* Mobile / PWA horizon: app header + search (hidden from md up). */}
      <div className="mx-auto w-full max-w-[26rem] px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:hidden">
        <HomeHeader viewer={viewer} />
        <SearchBar className="mt-4" />
      </div>

      {/* Shared catalog: one client-side filter drives both layouts. */}
      <main className="mt-4 flex-1 pb-28 md:pb-12">
        <CatalogBrowser products={products} featured={featured} />
      </main>

      {/* Desktop / web horizon: footer. */}
      <SiteFooter />

      {/* Mobile / PWA horizon: floating tab bar. */}
      <BottomNav />
    </div>
  );
}
