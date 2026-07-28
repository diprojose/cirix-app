import Link from "next/link";
import type { ViewerDto } from "@/modules/iam/application/dtos/viewer-dto";
import { WalletBadge } from "./wallet-badge";

/**
 * HomeHeader is the mobile app header: the wordmark plus, for signed-in
 * customers, their reward balance. The old notification bell lived here with a
 * permanently-lit unread dot and no destination; the balance replaces it,
 * because on a storefront whose point is a retention loop the balance is the
 * one number worth the corner.
 *
 * `wallet` is `null` for guests, who get a sign-in prompt instead.
 */
export function HomeHeader({
  viewer,
  wallet,
}: {
  viewer: ViewerDto;
  wallet: { availableCents: number; currency: string; streakWeeks: number } | null;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <Link
        href="/loyalty"
        className="rounded-sm text-h-section font-bold tracking-tight text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        mixmag
      </Link>

      {wallet ? (
        <WalletBadge
          availableCents={wallet.availableCents}
          currency={wallet.currency}
          streakWeeks={wallet.streakWeeks}
        />
      ) : (
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center rounded-pill bg-accent-fill px-4 text-label font-semibold text-on-accent transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fill focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          {viewer.authenticated ? "Mi cuenta" : "Iniciar sesión"}
        </Link>
      )}
    </header>
  );
}
