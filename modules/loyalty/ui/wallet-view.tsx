import { getCurrentLocale, pick } from "@/lib/i18n";
import { formatPrice } from "@/lib/format/money";
import type { WalletDto, WalletEntryDto } from "@/modules/loyalty/rewards/application/dtos/wallet-dto";
import type { RewardReason } from "@/modules/loyalty/rewards/domain/value-objects/reward-reason";
import type { LedgerStatus } from "@/modules/loyalty/rewards/domain/value-objects/ledger-status";

const REASON_LABELS: Record<RewardReason, { es: string; en: string }> = {
  earn_purchase: { es: "Credito por compra", en: "Purchase credit" },
  burn_redemption: { es: "Credito usado", en: "Credit redeemed" },
  reversal_refund: { es: "Reverso", en: "Reversal" },
  manual_adjustment: { es: "Ajuste", en: "Adjustment" },
  referral_reward: { es: "Recompensa por referido", en: "Referral reward" },
  promotion: { es: "Promocion", en: "Promotion" },
};

const STATUS_LABELS: Record<LedgerStatus, { es: string; en: string }> = {
  pending: { es: "Pendiente", en: "Pending" },
  available: { es: "Disponible", en: "Available" },
  reversed: { es: "Revertido", en: "Reversed" },
  expired: { es: "Expirado", en: "Expired" },
};

const STATUS_CLASSES: Record<LedgerStatus, string> = {
  pending: "bg-stone-100 text-text-muted",
  available: "bg-action-fill/10 text-action-strong",
  reversed: "bg-danger/10 text-danger",
  expired: "bg-stone-100 text-stone-400",
};

function shortDate(iso: string | null, locale: "es" | "en"): string {
  if (iso === null) return "-";

  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function WalletView({ wallet }: { wallet: WalletDto }) {
  const locale = await getCurrentLocale();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-action-fill to-action-strong p-5 text-on-action shadow-action">
        <p className="text-xs font-medium uppercase tracking-wide opacity-90">
          {pick(locale, { es: "Credito disponible", en: "Available credit" })}
        </p>
        <p className="mt-1 text-4xl font-extrabold tabular-nums">
          {formatPrice(wallet.availableCents, "USD")}
        </p>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="opacity-90">
            {pick(locale, { es: "Pendiente:", en: "Pending:" })}{" "}
            <span className="font-semibold tabular-nums">
              {formatPrice(wallet.pendingCents, "USD")}
            </span>
          </span>
          {wallet.nextExpiration && (
            <span className="opacity-90">
              {pick(locale, { es: "Vence", en: "Expires" })}{" "}
              {shortDate(wallet.nextExpiration, locale)}
            </span>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-text">
          {pick(locale, { es: "Movimientos", en: "Activity" })}
        </h2>
        {wallet.entries.length === 0 ? (
          <p className="rounded-2xl bg-surface px-4 py-8 text-center text-sm text-text-muted shadow-xs">
            {pick(locale, {
              es: "Aun no tienes movimientos. Gana credito con cada compra.",
              en: "You have no wallet activity yet. Earn credit with every order.",
            })}
          </p>
        ) : (
          <ul className="space-y-2">
            {wallet.entries.map((entry) => (
              <WalletRow key={entry.id} entry={entry} locale={locale} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function WalletRow({
  entry,
  locale,
}: {
  entry: WalletEntryDto;
  locale: "es" | "en";
}) {
  const positive = entry.amountCents >= 0;

  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 shadow-xs">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-text">
          {REASON_LABELS[entry.reason][locale]}
        </p>
        <p className="text-xs text-text-muted">{shortDate(entry.createdAt, locale)}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span
          className={`text-sm font-bold tabular-nums ${
            positive ? "text-action-strong" : "text-danger"
          }`}
        >
          {positive ? "+" : "-"}
          {formatPrice(Math.abs(entry.amountCents), "USD")}
        </span>
        <span
          className={`rounded-pill px-2 py-0.5 text-[0.65rem] font-semibold ${STATUS_CLASSES[entry.status]}`}
        >
          {STATUS_LABELS[entry.status][locale]}
        </span>
      </div>
    </li>
  );
}
