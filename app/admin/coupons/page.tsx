import type { Metadata } from "next";
import Link from "next/link";
import { requireOperator } from "@/lib/auth/dal";
import { formatPrice } from "@/lib/format/money";
import { makeListCoupons } from "@/modules/coupons/infrastructure/di/coupons-container";
import type { CouponDto } from "@/modules/coupons/application/dtos/coupon-dto";
import { FeedbackBanner } from "@/components/admin/feedback-banner";
import { deleteCouponAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Cupones" };

/** Short human summary of a coupon's discount and conditions. */
function conditionsLabel(coupon: CouponDto): string {
  const discount =
    coupon.discountType === "percentage"
      ? `${coupon.value}%`
      : formatPrice(coupon.value, "USD");
  const parts = [`${discount} de descuento`];
  if (coupon.minSpendCents > 0) {
    parts.push(`mín ${formatPrice(coupon.minSpendCents, "USD")}`);
  }
  parts.push(
    coupon.usageLimitPerCustomer === null
      ? "usos ilimitados"
      : `${coupon.usageLimitPerCustomer}/cliente`
  );
  if (coupon.expiresAt) {
    parts.push(`expira ${coupon.expiresAt.slice(0, 10)}`);
  }
  return parts.join(" · ");
}

/**
 * Operator coupon view: every coupon with its conditions, active state, edit
 * links and a delete escape hatch (prefer deactivating anything already shared).
 */
export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOperator();
  const { error } = await searchParams;

  const result = await makeListCoupons().execute();
  const coupons = result.ok ? result.value : [];

  return (
    <div>
      <FeedbackBanner error={error} />

      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text">Cupones ({coupons.length})</h1>
        <Link
          href="/admin/coupons/new"
          className="rounded-pill bg-gradient-to-r from-cta to-cta-strong px-4 py-2 text-sm font-semibold text-on-cta shadow-cta transition-transform active:scale-95"
        >
          + Nuevo
        </Link>
      </div>

      {coupons.length === 0 ? (
        <p className="rounded-2xl bg-surface px-4 py-8 text-center text-sm text-text-muted shadow-xs">
          Aún no hay cupones. Crea el primero.
        </p>
      ) : (
        <ul className="space-y-2">
          {coupons.map((coupon) => (
            <li
              key={coupon.id}
              className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold tracking-wide text-text">
                  {coupon.code}
                  <span
                    className={`ml-2 rounded-pill px-2 py-0.5 text-[10px] font-semibold ${
                      coupon.active
                        ? "bg-cta/15 text-cta-strong"
                        : "bg-sugar-200 text-text-muted"
                    }`}
                  >
                    {coupon.active ? "Activo" : "Inactivo"}
                  </span>
                </p>
                <p className="truncate text-xs text-text-muted">{conditionsLabel(coupon)}</p>
              </div>

              <Link
                href={`/admin/coupons/${coupon.id}`}
                className="shrink-0 rounded-pill border border-border px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-sugar-100"
              >
                Editar
              </Link>
              <form action={deleteCouponAction.bind(null, coupon.id)}>
                <button
                  type="submit"
                  aria-label={`Eliminar ${coupon.code}`}
                  className="shrink-0 rounded-pill border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger transition-transform active:scale-95"
                >
                  Eliminar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
