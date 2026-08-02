import { getCurrentLocale, pick } from "@/lib/i18n";
import { formatPrice } from "@/lib/format/money";
import type { CustomerProfileDto } from "@/modules/loyalty/customers/application/dtos/customer-profile-dto";
import type { RfmSegment } from "@/modules/loyalty/customers/domain/value-objects/rfm-segment";
import type { CouponDto } from "@/modules/loyalty/coupons/application/dtos/coupon-dto";

const SEGMENT_LABELS: Record<RfmSegment, { es: string; en: string }> = {
  nuevo: { es: "Nuevo", en: "New" },
  activo: { es: "Activo", en: "Active" },
  vip: { es: "VIP", en: "VIP" },
  en_riesgo: { es: "En riesgo", en: "At risk" },
  inactivo: { es: "Inactivo", en: "Inactive" },
};

function discountLabel(coupon: CouponDto): string {
  return coupon.discountType === "percentage"
    ? `${coupon.value}%`
    : formatPrice(coupon.value, "USD");
}

export async function RewardsPerks({
  profile,
  coupons,
}: {
  profile: CustomerProfileDto;
  coupons: CouponDto[];
}) {
  const locale = await getCurrentLocale();
  const target = Math.max(1, profile.streakTargetWeeks);
  const pct = Math.min(100, Math.round((profile.streakWeeks / target) * 100));

  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-2xl bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-text">
            {pick(locale, { es: "Tu racha", en: "Your streak" })}
          </h2>
          <span className="rounded-pill bg-stone-100 px-2 py-0.5 text-[0.65rem] font-semibold text-text-muted">
            {SEGMENT_LABELS[profile.segment][locale]}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-pill bg-stone-100">
          <div
            className="h-full rounded-pill bg-gradient-to-r from-action-fill to-action-strong"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-text-muted">
          {pick(locale, {
            es: `${profile.streakWeeks} de ${target} semanas seguidas: completa la racha para ganar un bono.`,
            en: `${profile.streakWeeks} of ${target} weeks completed: finish the streak to unlock a bonus.`,
          })}
        </p>
      </section>

      {coupons.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-text">
            {pick(locale, { es: "Cupones para ti", en: "Coupons for you" })}
          </h2>
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
                      {pick(locale, { es: "min", en: "min" })}{" "}
                      {formatPrice(coupon.minSpendCents, "USD")}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-pill bg-action-fill/10 px-2.5 py-1 text-xs font-bold text-action-strong">
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
