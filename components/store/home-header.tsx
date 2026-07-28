import type { ViewerDto } from "@/modules/iam/application/dtos/viewer-dto";
import { LocalizedLink } from "@/components/localized-link";
import { getCurrentLocale, pick } from "@/lib/i18n";
import { WalletBadge } from "./wallet-badge";

export async function HomeHeader({
  viewer,
  wallet,
}: {
  viewer: ViewerDto;
  wallet: { availableCents: number; currency: string; streakWeeks: number } | null;
}) {
  const locale = await getCurrentLocale();

  return (
    <header className="flex items-center justify-between gap-3">
      <LocalizedLink
        href="/loyalty"
        className="rounded-sm text-h-section font-bold tracking-tight text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        mixmag
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
          className="inline-flex min-h-11 items-center rounded-pill bg-accent-fill px-4 text-label font-semibold text-on-accent transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fill focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          {viewer.authenticated
            ? pick(locale, { es: "Mi cuenta", en: "My account" })
            : pick(locale, { es: "Iniciar sesiÃ³n", en: "Sign in" })}
        </LocalizedLink>
      )}
    </header>
  );
}
