"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/components/locale-provider";
import { pick, type Locale } from "@/lib/locale";
import type { PointsSummaryDto } from "@/modules/receipts/application/dtos/receipt-dtos";
import type { RedemptionDto, RewardDto } from "@/modules/receipts/application/dtos/reward-dtos";
import { ReceiptScanner } from "./receipt-scanner";
import { CardFace } from "@/components/card-design/card-face";
import type { CardLook } from "@/modules/card-design/application/card-design-use-cases";
import { RewardsSection } from "./rewards-section";

function movementLabel(reason: PointsSummaryDto["entries"][number]["reason"], locale: Locale): string {
  switch (reason) {
    case "redemption":
      return pick(locale, { es: "Canje", en: "Redemption" });
    case "refund":
      return pick(locale, { es: "Puntos devueltos", en: "Points returned" });
    default:
      return pick(locale, { es: "Recibo", en: "Receipt" });
  }
}

/** A customer's points at a supermarket: the balance, the scanner, the prizes and the latest movements. */
export function PointsView({
  slug,
  businessName,
  pointsPerDollar,
  receipts,
  summary,
  rewards,
  redemptions,
  look,
  customerName = null,
}: {
  /** The card in the business's colours and logo. */
  look: CardLook;
  /** The customer's first name, printed on the card. */
  customerName?: string | null;
  slug: string;
  businessName: string;
  pointsPerDollar: number;
  receipts: boolean;
  summary: PointsSummaryDto;
  rewards: RewardDto[];
  redemptions: RedemptionDto[];
}) {
  const locale = useLocale();
  const router = useRouter();
  const number = new Intl.NumberFormat(locale);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">{businessName}</h1>
      <CardFace
        look={look}
        businessName={businessName}
        ariaLabel={pick(locale, { es: "Tu tarjeta de puntos", en: "Your points card" })}
        label={pick(locale, { es: "Tus puntos", en: "Your points" })}
        value={number.format(summary.balance)}
        fields={[
          ...(receipts
            ? [{ label: pick(locale, { es: "Ganas", en: "You earn" }), value: pick(locale, { es: `${pointsPerDollar} puntos por dólar`, en: `${pointsPerDollar} points per dollar` }) }]
            : []),
          ...(customerName ? [{ label: pick(locale, { es: "Nombre", en: "Name" }), value: customerName }] : []),
        ]}
      />

      {receipts ? (
        <ReceiptScanner slug={slug} onScanned={() => router.refresh()} />
      ) : (
        <p className="text-center text-label text-text-muted">
          {pick(locale, { es: "Este negocio aún no está recibiendo recibos.", en: "This business isn't accepting receipts yet." })}
        </p>
      )}

      <RewardsSection slug={slug} balance={summary.balance} rewards={rewards} redemptions={redemptions} />

      {summary.entries.length > 0 && (
        <section aria-labelledby="points-history" className="flex flex-col gap-2">
          <h2 id="points-history" className="text-body font-medium text-text">{pick(locale, { es: "Últimos movimientos", en: "Latest activity" })}</h2>
          <ul className="flex flex-col gap-2">
            {summary.entries.map((entry) => (
              <li key={entry.id} className="flex items-baseline justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-label text-text">
                <span>{movementLabel(entry.reason, locale)} · {date.format(new Date(entry.at))}</span>
                <span className="font-medium tabular-nums">{entry.delta > 0 ? "+" : ""}{number.format(entry.delta)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
