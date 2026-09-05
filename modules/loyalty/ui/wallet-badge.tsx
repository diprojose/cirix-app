import { formatPrice } from "@/lib/format/money";
import { LocalizedLink } from "@/components/localized-link";
import { WalletIcon } from "./icons";

/**
 * WalletBadge keeps the reward balance on screen wherever the customer is.
 * The retention loop only works if the value it accrues is visible: a balance
 * buried one navigation away is a balance nobody spends. Rendered in orange
 * (the action/value colour) so it reads as money rather than as chrome.
 *
 * Both numbers come from real domain data: the balance folds the append-only
 * ledger (`GetWallet`) and the streak is the customer profile's own count. When
 * the streak is zero it is not rendered at all, rather than showing a "0" that
 * would read as a broken feature.
 */
export function WalletBadge({
  availableCents,
  currency = "USD",
  streakWeeks = 0,
  className = "",
}: {
  availableCents: number;
  currency?: string;
  streakWeeks?: number;
  className?: string;
}) {
  return (
    <LocalizedLink
      href="/billetera"
      className={`inline-flex min-h-11 items-center gap-2 rounded-pill bg-action-soft px-3 text-action-strong transition-colors hover:bg-action-soft-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-fill focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${className}`}
    >
      <WalletIcon className="h-5 w-5 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="text-label font-bold tabular-nums">
          {formatPrice(availableCents, currency)}
        </span>
        {streakWeeks > 0 && (
          <span className="mt-0.5 text-caption font-medium">
            {streakWeeks} {streakWeeks === 1 ? "semana" : "semanas"} seguidas
          </span>
        )}
      </span>
      <span className="sr-only">de saldo disponible. Ver mis movimientos.</span>
    </LocalizedLink>
  );
}
