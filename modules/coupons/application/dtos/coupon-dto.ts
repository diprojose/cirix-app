import type { Coupon } from "../../domain/entities/coupon";
import type { DiscountType } from "../../domain/value-objects/discount-type";

/**
 * CouponDto is the plain, serializable view of a {@link Coupon} exposed by use
 * cases. Being a plain object (no value objects), it crosses the RSC boundary
 * safely and backs both the operator's CRUD forms and the checkout preview.
 */
export type CouponDto = {
  id: string;
  code: string;
  discountType: DiscountType;
  value: number;
  minSpendCents: number;
  categoryScope: string[];
  segmentScope: string | null;
  usageLimitPerCustomer: number | null;
  stackable: boolean;
  expiresAt: string | null;
  active: boolean;
};

/** Maps a Coupon aggregate to its serializable DTO. */
export const toCouponDto = (coupon: Coupon): CouponDto => ({
  id: coupon.id.value,
  code: coupon.code,
  discountType: coupon.discountType,
  value: coupon.value,
  minSpendCents: coupon.minSpendCents,
  categoryScope: [...coupon.categoryScope],
  segmentScope: coupon.segmentScope,
  usageLimitPerCustomer: coupon.usageLimitPerCustomer,
  stackable: coupon.stackable,
  expiresAt: coupon.expiresAt,
  active: coupon.isActive,
});

/** The result of applying a coupon: which coupon and how much it discounts. */
export type AppliedCouponDto = {
  couponId: string;
  code: string;
  discountCents: number;
};
