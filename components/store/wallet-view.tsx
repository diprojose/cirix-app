import { formatPrice } from "@/lib/format/money";
import type { WalletDto, WalletEntryDto } from "@/modules/rewards/application/dtos/wallet-dto";
import type { RewardReason } from "@/modules/rewards/domain/value-objects/reward-reason";
import type { LedgerStatus } from "@/modules/rewards/domain/value-objects/ledger-status";

/** Human copy per ledger reason. */
const REASON_LABELS: Record<RewardReason, string> = {
  earn_purchase: "Crédito por compra",
  burn_redemption: "Crédito usado",
  reversal_refund: "Reverso",
  manual_adjustment: "Ajuste",
  referral_reward: "Recompensa por referido",
};

/** Human copy per ledger status. */
const STATUS_LABELS: Record<LedgerStatus, string> = {
  pending: "Pendiente",
  available: "Disponible",
  reversed: "Revertido",
  expired: "Expirado",
};

/** Tailwind chip classes per status. */
const STATUS_CLASSES: Record<LedgerStatus, string> = {
  pending: "bg-sugar-100 text-text-muted",
  available: "bg-cta/10 text-cta-strong",
  reversed: "bg-danger/10 text-danger",
  expired: "bg-sugar-100 text-sugar-400",
};

/** Formats an ISO date as a short Spanish date, or a dash when absent. */
function shortDate(iso: string | null): string {
  if (iso === null) return "—";
  return new Date(iso).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * WalletView renders a customer's loyalty wallet (US-A1, US-A2): the available
 * and pending balances up top, the next upcoming expiry, and the full
 * append-only line history below. A server component — the balance is already
 * folded in the DTO, so it only formats and lays out, never re-derives the rules.
 */
export function WalletView({ wallet }: { wallet: WalletDto }) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-cta to-cta-strong p-5 text-on-cta shadow-cta">
        <p className="text-xs font-medium uppercase tracking-wide opacity-90">
          Crédito disponible
        </p>
        <p className="mt-1 text-4xl font-extrabold tabular-nums">
          {formatPrice(wallet.availableCents, "USD")}
        </p>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="opacity-90">
            Pendiente:{" "}
            <span className="font-semibold tabular-nums">
              {formatPrice(wallet.pendingCents, "USD")}
            </span>
          </span>
          {wallet.nextExpiration && (
            <span className="opacity-90">Vence {shortDate(wallet.nextExpiration)}</span>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-text">Movimientos</h2>
        {wallet.entries.length === 0 ? (
          <p className="rounded-2xl bg-surface px-4 py-8 text-center text-sm text-text-muted shadow-xs">
            Aún no tienes movimientos. Gana crédito con cada compra.
          </p>
        ) : (
          <ul className="space-y-2">
            {wallet.entries.map((entry) => (
              <WalletRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** A single ledger line: reason + date on the left, signed amount + status chip on the right. */
function WalletRow({ entry }: { entry: WalletEntryDto }) {
  const positive = entry.amountCents >= 0;
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 shadow-xs">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-text">
          {REASON_LABELS[entry.reason]}
        </p>
        <p className="text-xs text-text-muted">{shortDate(entry.createdAt)}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span
          className={`text-sm font-bold tabular-nums ${
            positive ? "text-cta-strong" : "text-danger"
          }`}
        >
          {positive ? "+" : "−"}
          {formatPrice(Math.abs(entry.amountCents), "USD")}
        </span>
        <span
          className={`rounded-pill px-2 py-0.5 text-[0.65rem] font-semibold ${STATUS_CLASSES[entry.status]}`}
        >
          {STATUS_LABELS[entry.status]}
        </span>
      </div>
    </li>
  );
}
