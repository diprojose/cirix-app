import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth/dal";
import { formatPrice, formatVes } from "@/lib/format/money";
import { TopNav } from "@/components/store/top-nav";
import { SiteFooter } from "@/components/store/site-footer";
import { BottomNav } from "@/components/store/bottom-nav";
import { BackButton } from "@/components/store/back-button";
import { FeedbackBanner } from "@/components/admin/feedback-banner";
import { makeGetPremiumPlan } from "@/modules/subscription/infrastructure/di/subscription-container";
import { makeGetExchangeRate } from "@/modules/pricing/infrastructure/di/pricing-container";
import { BUSINESS_PROFILE } from "@/modules/ordering/infrastructure/config/business-profile";
import type { ViewerDto } from "@/modules/iam/application/dtos/viewer-dto";
import { requestPremiumAction } from "./actions";

export const metadata: Metadata = {
  title: "Suscripción premium",
  description:
    "Accede a las recetas de nuestros pasteleros: video tutoriales y pasos detallados.",
};

/** Shared input styling for the payment form. */
const FIELD_CLASS =
  "h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text placeholder:text-sugar-400 focus:outline-none focus:ring-2 focus:ring-cta";

/**
 * Premium plan screen (primary adapter). Shows the monthly price in both
 * currencies and runs the manual subscription flow: the customer pays by Pago
 * Móvil / transfer / Zelle, reports the reference here, and an operator
 * verifies and grants 30 days. Renewal reuses the same form. The app never
 * grants premium on its own.
 */
export default async function PremiumPage({
  searchParams,
}: {
  searchParams: Promise<{ requested?: string; error?: string }>;
}) {
  const [viewer, planResult, rateResult, params] = await Promise.all([
    getViewer(),
    makeGetPremiumPlan().execute(),
    makeGetExchangeRate().execute(),
    searchParams,
  ]);

  const plan = planResult.ok ? planResult.value : null;
  const vesPerUsd = rateResult.ok ? rateResult.value.vesPerUsd : null;
  const isPremium = viewer.tier === "premium" || viewer.tier === "operator";

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <TopNav viewer={viewer} />

      {/* Mobile / PWA horizon: top bar — back · Premium. */}
      <div className="mx-auto flex w-full max-w-[26rem] items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:hidden">
        <BackButton />
        <p className="flex-1 text-center text-base font-semibold text-text">Premium</p>
        <span className="h-10 w-10" aria-hidden="true" />
      </div>

      <main className="flex-1 pb-28 md:pb-12">
        <div className="mx-auto w-full max-w-[26rem] space-y-4 px-5 pt-4 md:max-w-2xl md:pt-8">
          <header>
            <h1 className="text-2xl font-bold text-text">Recetas premium</h1>
            <p className="mt-1 text-sm text-text-muted">
              Video tutoriales, imágenes y recetas paso a paso de nuestros pasteleros.
            </p>
          </header>

          {plan && (
            <div className="rounded-2xl bg-surface p-5 shadow-xs">
              <p className="text-3xl font-extrabold tabular-nums text-text">
                {formatPrice(plan.amountCents, plan.currency)}
                <span className="ml-1 text-base font-medium text-text-muted">/mes</span>
              </p>
              {vesPerUsd !== null && (
                <p className="text-sm font-medium tabular-nums text-text-muted">
                  {formatVes(plan.amountCents, vesPerUsd)} a tasa BCV
                </p>
              )}
            </div>
          )}

          <FeedbackBanner error={params.error} />

          {isPremium ? (
            <PremiumActive viewer={viewer} plan={plan?.amountCents ?? null} />
          ) : params.requested ? (
            <RequestConfirmation />
          ) : viewer.authenticated ? (
            <PaymentAndReport />
          ) : (
            <GuestPrompt />
          )}
        </div>
      </main>

      <SiteFooter />
      <BottomNav />
    </div>
  );
}

/** Shown to active subscribers: expiry, recipes link and the renewal form. */
function PremiumActive({
  viewer,
  plan,
}: {
  viewer: ViewerDto;
  plan: number | null;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-cta/10 p-5">
        <p className="text-sm font-semibold text-cta-strong">
          Ya eres premium
          {viewer.premiumUntil && (
            <span className="font-medium">
              {" "}
              — activa hasta el {viewer.premiumUntil.slice(0, 10)}
            </span>
          )}
          .
        </p>
        <Link
          href="/recipes"
          className="mt-3 flex h-12 items-center justify-center rounded-pill bg-gradient-to-r from-cta to-cta-strong px-6 text-sm font-semibold text-on-cta shadow-cta transition-transform active:scale-[0.98]"
        >
          Ver recetas
        </Link>
      </div>

      {viewer.premiumUntil && (
        <details className="rounded-2xl bg-surface p-4 shadow-xs">
          <summary className="cursor-pointer text-sm font-bold text-text">
            Renovar suscripción{plan !== null ? ` (${formatPrice(plan, "USD")})` : ""}
          </summary>
          <div className="mt-3">
            <PaymentAndReport renewal />
          </div>
        </details>
      )}
    </div>
  );
}

/** Payment instructions for every accepted method plus the report form. */
function PaymentAndReport({ renewal = false }: { renewal?: boolean }) {
  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">1 · Paga la mensualidad</h2>
        <InstructionCard
          title="Pago Móvil"
          rows={[
            ["Banco", BUSINESS_PROFILE.pagoMovil.bank],
            ["Teléfono", BUSINESS_PROFILE.pagoMovil.phone],
            ["Cédula/RIF", BUSINESS_PROFILE.pagoMovil.documentId],
          ]}
        />
        <InstructionCard
          title="Transferencia"
          rows={[
            ["Banco", BUSINESS_PROFILE.transfer.bank],
            ["Cuenta", BUSINESS_PROFILE.transfer.accountNumber],
            ["Titular", BUSINESS_PROFILE.transfer.holder],
          ]}
        />
        <InstructionCard
          title="Zelle"
          rows={[
            ["Correo", BUSINESS_PROFILE.zelle.email],
            ["Titular", BUSINESS_PROFILE.zelle.holder],
          ]}
        />
      </section>

      <section className="space-y-3 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">2 · Reporta tu pago</h2>
        <form action={requestPremiumAction} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text">Método</span>
            <select name="method" required className={FIELD_CLASS}>
              <option value="pago_movil">Pago Móvil</option>
              <option value="transferencia">Transferencia</option>
              <option value="zelle">Zelle</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text">Número de referencia</span>
            <input
              type="text"
              name="reference"
              required
              minLength={4}
              maxLength={40}
              placeholder="Ej. 001234567890"
              className={FIELD_CLASS}
            />
          </label>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center rounded-pill bg-gradient-to-r from-cta to-cta-strong text-sm font-semibold text-on-cta shadow-cta transition-transform active:scale-[0.98]"
          >
            {renewal ? "Reportar renovación" : "Reportar pago y solicitar premium"}
          </button>
          <p className="text-center text-xs text-text-muted">
            Un operador verifica el pago y activa {renewal ? "la renovación" : "tu premium"}{" "}
            (30 días). Te avisaremos por correo o WhatsApp.
          </p>
        </form>
      </section>
    </div>
  );
}

/** Key/value card listing one way to pay. */
function InstructionCard({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="space-y-1 rounded-xl bg-sugar-100 px-4 py-3">
      <p className="text-sm font-bold text-text">{title}</p>
      {rows.map(([label, value]) => (
        <p key={label} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-text-muted">{label}</span>
          <span className="font-semibold tabular-nums text-text">{value}</span>
        </p>
      ))}
    </div>
  );
}

/** Shown right after a request is recorded. */
function RequestConfirmation() {
  return (
    <div className="rounded-2xl bg-surface p-5 text-sm text-text shadow-xs">
      <p className="font-semibold">¡Pago reportado!</p>
      <p className="mt-1 text-text-muted">
        Un operador verificará la referencia y activará tu suscripción premium.
        Vuelve a iniciar sesión cuando te confirmemos para ver las recetas.
      </p>
    </div>
  );
}

/** Shown to guests: they must sign in before requesting premium. */
function GuestPrompt() {
  return (
    <div className="space-y-3 rounded-2xl bg-surface p-5 shadow-xs">
      <p className="text-sm text-text-muted">
        Inicia sesión para suscribirte y acceder a las recetas.
      </p>
      <Link
        href="/login?from=/premium"
        className="flex h-12 w-full items-center justify-center rounded-pill bg-gradient-to-r from-cta to-cta-strong text-sm font-semibold text-on-cta shadow-cta transition-transform active:scale-[0.98]"
      >
        Iniciar sesión
      </Link>
    </div>
  );
}
