import { redirect } from "next/navigation";
import { BottomNav } from "@/components/store/bottom-nav";
import { LocalizedLink } from "@/components/localized-link";
import { RewardsPerks } from "@/components/store/rewards-perks";
import { SiteFooter } from "@/components/store/site-footer";
import { SubHeader } from "@/components/store/sub-header";
import { TopNav } from "@/components/store/top-nav";
import { WalletView } from "@/components/store/wallet-view";
import { CONTAINER_READ } from "@/components/store/layout";
import { getViewer, requireCustomer } from "@/lib/auth/dal";
import { getCurrentLocale, localizeForCurrentRequest, pick } from "@/lib/i18n";
import { makeListEligibleCoupons } from "@/modules/coupons/infrastructure/di/coupons-container";
import { makeGetCustomerProfile } from "@/modules/customers/infrastructure/di/customers-container";
import { makeGetWallet } from "@/modules/rewards/infrastructure/di/rewards-container";

export default async function WalletPage() {
  const locale = await getCurrentLocale();
  const viewer = await requireCustomer();
  const uid = viewer.uid;
  if (!uid) {
    redirect(await localizeForCurrentRequest("/login"));
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

      <SubHeader title={pick(locale, { es: "Mi billetera", en: "My wallet" })} />

      <main className="flex-1 pb-28 md:pb-12">
        <div className={`${CONTAINER_READ} pt-4 md:pt-8`}>
          <h2 className="mb-4 hidden text-display font-bold text-text md:block">
            {pick(locale, { es: "Mi billetera", en: "My wallet" })}
          </h2>
          <WalletView wallet={wallet} />
          <div className="mt-6">
            <RewardsPerks profile={profile} coupons={eligibleCoupons} />
          </div>
          <div className="mt-6 space-y-2">
            <LocalizedLink
              href="/referidos"
              className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-4 shadow-xs transition-colors hover:bg-stone-100"
            >
              <span className="text-sm font-semibold text-text">
                {pick(locale, {
                  es: "Invita amigos y gana credito",
                  en: "Refer friends and earn credit",
                })}
              </span>
              <span className="text-action-strong" aria-hidden="true">
                &gt;
              </span>
            </LocalizedLink>
            <LocalizedLink
              href="/notificaciones"
              className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-4 shadow-xs transition-colors hover:bg-stone-100"
            >
              <span className="text-sm font-semibold text-text">
                {pick(locale, { es: "Notificaciones", en: "Notifications" })}
              </span>
              <span className="text-action-strong" aria-hidden="true">
                &gt;
              </span>
            </LocalizedLink>
          </div>
        </div>
      </main>

      <SiteFooter />
      <BottomNav canOperateStore={viewer.permissions.canOperateStore} />
    </div>
  );
}
