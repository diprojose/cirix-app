import type { ViewerDto } from "@/core/iam/application/dtos/viewer-dto";
import { LocalizedLink } from "@/components/localized-link";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { WalletBadge } from "./wallet-badge";
import { BrandLogo } from "@/modules/loyalty/branding/ui/brand-logo";
import { LocationIcon } from "./icons";

export async function HomeHeader({
  viewer,
  wallet,
}: {
  viewer: ViewerDto;
  wallet: { availableCents: number; currency: string; streakWeeks: number } | null;
}) {
  const locale = await getCurrentLocale();

  return (
    <header className="space-y-3">
      <div className="flex items-center justify-between gap-3">
      <LocalizedLink
        href="/loyalty"
        aria-label={pick(locale, { es: "Ir al inicio", en: "Go home" })}
        className="min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <BrandLogo />
      </LocalizedLink>

      {wallet ? (
        <WalletBadge
          availableCents={wallet.availableCents}
          currency={wallet.currency}
          streakWeeks={wallet.streakWeeks}
        />
      ) : (
        <LocalizedLink
          href="/login"
          className="inline-flex min-h-11 items-center rounded-pill bg-accent-fill px-4 text-label font-semibold text-on-accent transition-colors hover:bg-accent-fill-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fill focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          {viewer.authenticated
            ? pick(locale, { es: "Mi cuenta", en: "My account" })
            : pick(locale, { es: "Ingresar", en: "Sign in" })}
        </LocalizedLink>
      )}
      </div>

      <div className="flex min-h-9 items-center gap-2 text-label text-text-muted">
        <LocationIcon className="h-4 w-4 text-accent" />
        <span>{pick(locale, { es: "Entregando en", en: "Delivering to" })}</span>
        <strong className="text-text">Caracas</strong>
      </div>
    </header>
  );
}
