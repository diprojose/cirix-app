import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, requireCustomer } from "@/lib/auth/dal";
import { makeGetWallet } from "@/modules/rewards/infrastructure/di/rewards-container";
import { makeGetCustomerProfile } from "@/modules/customers/infrastructure/di/customers-container";
import { makeListEligibleCoupons } from "@/modules/coupons/infrastructure/di/coupons-container";
import { TopNav } from "@/components/store/top-nav";
import { SiteFooter } from "@/components/store/site-footer";
import { BottomNav } from "@/components/store/bottom-nav";
import { SubHeader } from "@/components/store/sub-header";
import { CONTAINER_READ } from "@/components/store/layout";
import { WalletView } from "@/components/store/wallet-view";
import { RewardsPerks } from "@/components/store/rewards-perks";

export const metadata: Metadata = {
  title: "Mi billetera",
  description: "Tu crédito de recompensas: disponible, pendiente y movimientos.",
};

/**
 * Wallet page: the customer's loyalty wallet. `requireCustomer` is the wall —
 * guests are redirected to login — and the wallet is read scoped strictly to the
 * signed-in viewer's own uid, so a customer only ever sees their own ledger
 * (the app's server-side stand-in for row-level isolation, US-A1).
 */
export default async function WalletPage() {
  const viewer = await requireCustomer();
  const uid = viewer.uid;
  if (!uid) {
    redirect("/login");
  }

  const [navViewer, walletResult, profileResult] = await Promise.all([
    getViewer(),
    makeGetWallet().execute({ customerUid: uid }),
    makeGetCustomerProfile().execute({ customerUid: uid }),
  ]);
  const wallet = walletResult.ok
    ? walletResult.value
    : { availableCents: 0, pendingCents: 0, nextExpiration: null, entries: [] };
  const profile = profileResult.ok
    ? profileResult.value
    : { segment: "nuevo" as const, orderCount: 0, streakWeeks: 0, streakTargetWeeks: 4 };

  const couponsResult = await makeListEligibleCoupons().execute({
    customerSegment: profile.segment,
  });
  const eligibleCoupons = couponsResult.ok ? couponsResult.value : [];

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <TopNav viewer={navViewer} />

      <SubHeader title="Mi billetera" />

      <main className="flex-1 pb-28 md:pb-12">
        <div className={`${CONTAINER_READ} pt-4 md:pt-8`}>
          <h2 className="mb-4 hidden text-display font-bold text-text md:block">Mi billetera</h2>
          <WalletView wallet={wallet} />
          <div className="mt-6">
            <RewardsPerks profile={profile} coupons={eligibleCoupons} />
          </div>
          <div className="mt-6 space-y-2">
            <Link
              href="/referidos"
              className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-4 shadow-xs transition-colors hover:bg-stone-100"
            >
              <span className="text-sm font-semibold text-text">
                Invita amigos y gana crédito
              </span>
              <span className="text-action-strong" aria-hidden="true">
                →
              </span>
            </Link>
            <Link
              href="/notificaciones"
              className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-4 shadow-xs transition-colors hover:bg-stone-100"
            >
              <span className="text-sm font-semibold text-text">Notificaciones</span>
              <span className="text-action-strong" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
      <BottomNav />
    </div>
  );
}
