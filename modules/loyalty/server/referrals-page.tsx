import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/dal";
import { formatPrice } from "@/lib/format/money";
import { localizeForCurrentRequest } from "@/lib/i18n";
import type { ReferralState } from "@/modules/loyalty/referrals/domain/value-objects/referral-state";
import {
  makeGetMyReferrals,
  makeGetOrCreateReferralLink,
} from "@/modules/loyalty/referrals/infrastructure/di/referrals-container";
import { BottomNav } from "@/modules/loyalty/ui/bottom-nav";
import { CONTAINER_READ } from "@/modules/loyalty/ui/layout";
import { ReferralLinkCard } from "@/modules/loyalty/ui/referral-link-card";
import { SiteFooter } from "@/modules/loyalty/ui/site-footer";
import { SubHeader } from "@/modules/loyalty/ui/sub-header";
import { TopNav } from "@/modules/loyalty/ui/top-nav";

export const metadata: Metadata = {
  title: "Invita y gana",
  description: "Comparte tu enlace de referido y gana credito.",
};

const STATE_LABELS: Record<ReferralState, string> = {
  registrado: "Registrado",
  primera_compra: "1ra compra hecha",
  recompensa_pendiente: "Recompensa desbloqueada",
  bloqueado: "Bloqueado",
};

export default async function ReferralsPage({
  basePath = null,
}: {
  basePath?: string | null;
} = {}) {
  const viewer = await getViewer();
  const uid = viewer.uid;
  if (!uid || !viewer.permissions.canPlaceOrders) {
    const referralsPath = `${basePath ?? ""}/referidos`;
    const returnTo = await localizeForCurrentRequest(referralsPath);
    const loginPath = basePath ? `${basePath}/login` : "/login";
    redirect(
      await localizeForCurrentRequest(
        `${loginPath}?from=${encodeURIComponent(returnTo)}`
      )
    );
  }

  const [linkResult, referralsResult, headerList] = await Promise.all([
    makeGetOrCreateReferralLink().execute({ referrerUid: uid }),
    makeGetMyReferrals().execute({ referrerUid: uid }),
    headers(),
  ]);

  const code = linkResult.ok ? linkResult.value.code : null;
  const referrals = referralsResult.ok ? referralsResult.value : [];
  const host = headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const url = code && host ? `${proto}://${host}/r/${code}` : "";

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <TopNav viewer={viewer} />

      <SubHeader title="Invita y gana" />

      <main className="flex-1 pb-28 md:pb-12">
        <div className={`${CONTAINER_READ} space-y-6 pt-4 md:pt-8`}>
          <h2 className="hidden text-display font-bold text-text md:block">Invita y gana</h2>

          {url ? (
            <ReferralLinkCard url={url} />
          ) : (
            <p className="rounded-2xl bg-surface px-4 py-6 text-center text-sm text-text-muted shadow-xs">
              No pudimos generar tu enlace ahora. Intenta mas tarde.
            </p>
          )}

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-text">Mis referidos ({referrals.length})</h2>
            {referrals.length === 0 ? (
              <p className="rounded-2xl bg-surface px-4 py-8 text-center text-sm text-text-muted shadow-xs">
                Aun no tienes referidos. Comparte tu enlace para empezar.
              </p>
            ) : (
              <ul className="space-y-2">
                {referrals.map((referral, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 shadow-xs"
                  >
                    <span className="text-sm font-medium text-text">{STATE_LABELS[referral.state]}</span>
                    {referral.rewardCents !== null && referral.rewardCents > 0 && (
                      <span className="text-sm font-bold tabular-nums text-action-strong">
                        +{formatPrice(referral.rewardCents, "USD")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      <SiteFooter />
      <BottomNav canOperateStore={viewer.permissions.canOperateStore} />
    </div>
  );
}
