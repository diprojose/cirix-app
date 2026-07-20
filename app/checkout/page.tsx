import type { Metadata } from "next";
import { getViewer } from "@/lib/auth/dal";
import { TopNav } from "@/components/store/top-nav";
import { SiteFooter } from "@/components/store/site-footer";
import { BottomNav } from "@/components/store/bottom-nav";
import { BackButton } from "@/components/store/back-button";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { makeListDeliveryZones } from "@/modules/ordering/infrastructure/di/ordering-container";
import { makeGetExchangeRate } from "@/modules/pricing/infrastructure/di/pricing-container";
import {
  makeGetWallet,
  makeGetRewardRules,
} from "@/modules/rewards/infrastructure/di/rewards-container";

export const metadata: Metadata = {
  title: "Finalizar pedido",
  description: "Completa tus datos de contacto y entrega para confirmar tu pedido.",
};

/**
 * Checkout page: the storefront's order-placement adapter. The server shell
 * resolves the delivery zones and the current BCV rate; the form itself is a
 * client component because the cart lives in the browser. Guests may check out
 * (an account is optional) — the phone number is the contact channel.
 */
export default async function CheckoutPage() {
  const viewer = await getViewer();

  const zonesResult = await makeListDeliveryZones().execute();
  const zones = zonesResult.ok ? zonesResult.value : [];

  const rateResult = await makeGetExchangeRate().execute();
  const exchangeRate = rateResult.ok ? rateResult.value : null;

  // Signed-in customers may pay part of the order with their wallet credit. We
  // pass the available balance and the per-order cap so the form can preview the
  // discount; the server action re-clamps both authoritatively on submit.
  let availableCreditCents = 0;
  let maxRedeemPctOfOrder = 0;
  if (viewer.authenticated && viewer.uid) {
    const [walletResult, rulesResult] = await Promise.all([
      makeGetWallet().execute({ customerUid: viewer.uid }),
      makeGetRewardRules().execute(),
    ]);
    availableCreditCents = walletResult.ok ? walletResult.value.availableCents : 0;
    maxRedeemPctOfOrder = rulesResult.ok ? rulesResult.value.maxRedeemPctOfOrder : 0;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {/* Desktop / web horizon: top navigation bar (hidden below md). */}
      <TopNav viewer={viewer} />

      {/* Mobile / PWA horizon: top bar — back · Finalizar pedido. */}
      <div className="mx-auto flex w-full max-w-[26rem] items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:hidden">
        <BackButton />
        <p className="flex-1 text-center text-base font-semibold text-text">
          Finalizar pedido
        </p>
        <span className="h-10 w-10" aria-hidden="true" />
      </div>

      <main className="flex-1 pb-28 md:pb-12">
        <div className="mx-auto w-full max-w-[26rem] px-5 pt-4 md:max-w-2xl md:pt-8">
          <h1 className="mb-4 hidden text-2xl font-bold text-text md:block">
            Finalizar pedido
          </h1>
          <CheckoutForm
            zones={zones}
            exchangeRate={exchangeRate}
            availableCreditCents={availableCreditCents}
            maxRedeemPctOfOrder={maxRedeemPctOfOrder}
          />
        </div>
      </main>

      {/* Desktop / web horizon: footer. */}
      <SiteFooter />

      {/* Mobile / PWA horizon: floating tab bar. */}
      <BottomNav />
    </div>
  );
}
