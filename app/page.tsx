import { getViewer } from "@/lib/auth/dal";
import { makeListAvailableProducts } from "@/modules/catalog/infrastructure/di/catalog-container";
import { makeGetWallet } from "@/modules/rewards/infrastructure/di/rewards-container";
import { makeGetCustomerProfile } from "@/modules/customers/infrastructure/di/customers-container";
import { TopNav } from "@/components/store/top-nav";
import { HomeHeader } from "@/components/store/home-header";
import { SearchBar } from "@/components/store/search-bar";
import { SearchProvider } from "@/components/store/search-provider";
import { CatalogBrowser } from "@/components/store/catalog-browser";
import { BottomNav } from "@/components/store/bottom-nav";
import { SiteFooter } from "@/components/store/site-footer";
import { COLUMN } from "@/components/store/layout";

/**
 * Home is the public storefront and the catalog's primary (driving) adapter. It
 * resolves the viewer, the produce catalog and (for signed-in customers) the
 * reward wallet on the server, then renders two responsive horizons from one
 * URL: the mobile PWA layout (app header, search, floating BottomNav) and the
 * desktop web layout (TopNav + wide grid + footer). Both share the same catalog
 * grid and the same live search, which is why the whole storefront sits inside
 * a single SearchProvider.
 */
export default async function Home() {
  const viewer = await getViewer();
  const uid = viewer.uid;

  const [productsResult, walletResult, profileResult] = await Promise.all([
    makeListAvailableProducts().execute(),
    uid ? makeGetWallet().execute({ customerUid: uid }) : Promise.resolve(null),
    uid ? makeGetCustomerProfile().execute({ customerUid: uid }) : Promise.resolve(null),
  ]);

  if (!productsResult.ok) {
    return (
      <main
        className={`${COLUMN} flex min-h-dvh flex-col items-center justify-center gap-2 text-center`}
      >
        <p className="text-title font-semibold text-text">No se pudo cargar la tienda.</p>
        <p className="text-body text-text-muted">Vuelve a intentarlo en un momento.</p>
      </main>
    );
  }

  const products = productsResult.value;

  // The badge only renders on a real read: a failed wallet load must not be
  // dressed up as a $0.00 balance.
  const wallet =
    walletResult?.ok === true
      ? {
          availableCents: walletResult.value.availableCents,
          currency: products[0]?.currency ?? "USD",
          streakWeeks: profileResult?.ok === true ? profileResult.value.streakWeeks : 0,
        }
      : null;

  return (
    <SearchProvider>
      <div className="flex min-h-dvh flex-col bg-bg">
        {/* Desktop / web horizon: top navigation bar (hidden below md). */}
        <TopNav viewer={viewer} wallet={wallet} searchable />

        {/* Mobile / PWA horizon: app header + search (hidden from md up). */}
        <div className={`${COLUMN} pt-[calc(env(safe-area-inset-top)+0.75rem)] md:hidden`}>
          <HomeHeader viewer={viewer} wallet={wallet} />
          <SearchBar className="mt-3" />
        </div>

        <main className="flex-1 pb-28 md:pb-12">
          <CatalogBrowser products={products} />
        </main>

        <SiteFooter />
        <BottomNav />
      </div>
    </SearchProvider>
  );
}
