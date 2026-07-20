import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer, requireCustomer } from "@/lib/auth/dal";
import { makeGetWallet } from "@/modules/rewards/infrastructure/di/rewards-container";
import { TopNav } from "@/components/store/top-nav";
import { SiteFooter } from "@/components/store/site-footer";
import { BottomNav } from "@/components/store/bottom-nav";
import { BackButton } from "@/components/store/back-button";
import { WalletView } from "@/components/store/wallet-view";

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

  const [navViewer, walletResult] = await Promise.all([
    getViewer(),
    makeGetWallet().execute({ customerUid: uid }),
  ]);
  const wallet = walletResult.ok
    ? walletResult.value
    : { availableCents: 0, pendingCents: 0, nextExpiration: null, entries: [] };

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <TopNav viewer={navViewer} />

      <div className="mx-auto flex w-full max-w-[26rem] items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:hidden">
        <BackButton />
        <p className="flex-1 text-center text-base font-semibold text-text">Mi billetera</p>
        <span className="h-10 w-10" aria-hidden="true" />
      </div>

      <main className="flex-1 pb-28 md:pb-12">
        <div className="mx-auto w-full max-w-[26rem] px-5 pt-4 md:max-w-2xl md:pt-8">
          <h1 className="mb-4 hidden text-2xl font-bold text-text md:block">Mi billetera</h1>
          <WalletView wallet={wallet} />
        </div>
      </main>

      <SiteFooter />
      <BottomNav />
    </div>
  );
}
