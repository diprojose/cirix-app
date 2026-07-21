import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getViewer, requireCustomer } from "@/lib/auth/dal";
import { formatPrice } from "@/lib/format/money";
import {
  makeGetOrCreateReferralLink,
  makeGetMyReferrals,
} from "@/modules/referrals/infrastructure/di/referrals-container";
import type { ReferralState } from "@/modules/referrals/domain/value-objects/referral-state";
import { TopNav } from "@/components/store/top-nav";
import { SiteFooter } from "@/components/store/site-footer";
import { BottomNav } from "@/components/store/bottom-nav";
import { SubHeader } from "@/components/store/sub-header";
import { CONTAINER_READ } from "@/components/store/layout";
import { ReferralLinkCard } from "@/components/store/referral-link-card";

export const metadata: Metadata = {
  title: "Invita y gana",
  description: "Comparte tu enlace de referido y gana crédito.",
};

/** Human copy per referral state. */
const STATE_LABELS: Record<ReferralState, string> = {
  registrado: "Registrado",
  primera_compra: "1ª compra hecha",
  recompensa_pendiente: "Recompensa desbloqueada",
  bloqueado: "Bloqueado",
};

/**
 * Referrals page: the customer's own referral link plus the state of everyone
 * they invited (US-D1, US-D5). `requireCustomer` is the wall, and the panel is
 * read scoped to the signed-in viewer's uid, so a referrer only ever sees their
 * own funnel.
 */
export default async function ReferralsPage() {
  const viewer = await requireCustomer();
  const uid = viewer.uid;
  if (!uid) {
    redirect("/login");
  }

  const [navViewer, linkResult, referralsResult, headerList] = await Promise.all([
    getViewer(),
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
      <TopNav viewer={navViewer} />

      <SubHeader title="Invita y gana" />

      <main className="flex-1 pb-28 md:pb-12">
        <div className={`${CONTAINER_READ} space-y-6 pt-4 md:pt-8`}>
          <h2 className="hidden text-display font-bold text-text md:block">Invita y gana</h2>

          {url ? (
            <ReferralLinkCard url={url} />
          ) : (
            <p className="rounded-2xl bg-surface px-4 py-6 text-center text-sm text-text-muted shadow-xs">
              No pudimos generar tu enlace ahora. Intenta más tarde.
            </p>
          )}

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-text">Mis referidos ({referrals.length})</h2>
            {referrals.length === 0 ? (
              <p className="rounded-2xl bg-surface px-4 py-8 text-center text-sm text-text-muted shadow-xs">
                Aún no tienes referidos. Comparte tu enlace para empezar.
              </p>
            ) : (
              <ul className="space-y-2">
                {referrals.map((referral, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 shadow-xs"
                  >
                    <span className="text-sm font-medium text-text">
                      {STATE_LABELS[referral.state]}
                    </span>
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
