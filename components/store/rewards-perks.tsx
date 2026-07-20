import { formatPrice } from "@/lib/format/money";
import type { CustomerProfileDto } from "@/modules/customers/application/dtos/customer-profile-dto";
import type { RfmSegment } from "@/modules/customers/domain/value-objects/rfm-segment";
import type { CouponDto } from "@/modules/coupons/application/dtos/coupon-dto";

/** Human copy per RFM segment. */
const SEGMENT_LABELS: Record<RfmSegment, string> = {
  nuevo: "Nuevo",
  activo: "Activo",
  vip: "VIP",
  en_riesgo: "En riesgo",
  inactivo: "Inactivo",
};

/** Short summary of a coupon's discount. */
function discountLabel(coupon: CouponDto): string {
  return coupon.discountType === "percentage"
    ? `${coupon.value}%`
    : formatPrice(coupon.value, "USD");
}

/**
 * RewardsPerks shows the customer's retention perks on the wallet: their weekly
 * streak progress toward the next bonus (US-B7), their segment, and the coupons
 * currently available to them (untargeted plus those aimed at their segment,
 * US-B4). A server component — it only formats data folded upstream.
 */
export function RewardsPerks({
  profile,
  coupons,
}: {
  profile: CustomerProfileDto;
  coupons: CouponDto[];
}) {
  const target = Math.max(1, profile.streakTargetWeeks);
  const pct = Math.min(100, Math.round((profile.streakWeeks / target) * 100));

  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-2xl bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-text">Tu racha</h2>
          <span className="rounded-pill bg-sugar-100 px-2 py-0.5 text-[0.65rem] font-semibold text-text-muted">
            {SEGMENT_LABELS[profile.segment]}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-pill bg-sugar-100">
          <div
            className="h-full rounded-pill bg-gradient-to-r from-cta to-cta-strong"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-text-muted">
          {profile.streakWeeks} de {target} semanas seguidas — completa la racha para ganar un
          bono.
        </p>
      </section>

      {coupons.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-text">Cupones para ti</h2>
          <ul className="space-y-2">
            {coupons.map((coupon) => (
              <li
                key={coupon.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 shadow-xs"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold tracking-wide text-text">
                    {coupon.code}
                  </p>
                  {coupon.minSpendCents > 0 && (
                    <p className="text-xs text-text-muted">
                      mín {formatPrice(coupon.minSpendCents, "USD")}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-pill bg-cta/10 px-2.5 py-1 text-xs font-bold text-cta-strong">
                  {discountLabel(coupon)} OFF
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
