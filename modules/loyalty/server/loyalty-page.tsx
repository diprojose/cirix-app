import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/dal";
import { makeListAvailableProducts } from "@/modules/loyalty/catalog/infrastructure/di/catalog-container";
import { makeGetCustomerProfile } from "@/modules/loyalty/customers/infrastructure/di/customers-container";
import { makeGetWallet } from "@/modules/loyalty/rewards/infrastructure/di/rewards-container";
import { BottomNav } from "@/modules/loyalty/ui/bottom-nav";
import { CatalogBrowser } from "@/modules/loyalty/ui/catalog-browser";
import { HomeHeader } from "@/modules/loyalty/ui/home-header";
import { COLUMN } from "@/modules/loyalty/ui/layout";
import { SearchBar } from "@/modules/loyalty/ui/search-bar";
import { SearchProvider } from "@/modules/loyalty/ui/search-provider";
import { SiteFooter } from "@/modules/loyalty/ui/site-footer";
import { TopNav } from "@/modules/loyalty/ui/top-nav";

export const metadata: Metadata = {
  title: "Loyalty Commerce",
  description:
    "The grocery storefront demo for rewards, referrals, wallet credit, and repeat-purchase flows.",
};

export default async function LoyaltyPage() {
  const viewer = await getViewer();
  const uid = viewer.uid;

  const [productsResult, walletResult, profileResult] = await Promise.all([
    makeListAvailableProducts().execute(),
    uid ? makeGetWallet().execute({ customerUid: uid }) : Promise.resolve(null),
    uid ? makeGetCustomerProfile().execute({ customerUid: uid }) : Promise.resolve(null),
  ]);

  if (!productsResult.ok) {
    return (
      <main className={`${COLUMN} flex min-h-dvh flex-col items-center justify-center gap-2 text-center`}>
        <p className="text-title font-semibold text-text">No se pudo cargar la tienda.</p>
        <p className="text-body text-text-muted">Vuelve a intentarlo en un momento.</p>
      </main>
    );
  }

  const products = productsResult.value;
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
        <TopNav viewer={viewer} wallet={wallet} searchable />

        <div className={`${COLUMN} pt-[calc(env(safe-area-inset-top)+0.75rem)] md:hidden`}>
          <HomeHeader viewer={viewer} wallet={wallet} />
          <SearchBar className="mt-3" />
        </div>

        <main className="flex-1 pb-28 md:pb-12">
          <CatalogBrowser products={products} />
        </main>

        <SiteFooter />
        <BottomNav canOperateStore={viewer.permissions.canOperateStore} />
      </div>
    </SearchProvider>
  );
}
