/**
 * How a coupon's `value` is interpreted:
 * - `percentage` — `value` is a percent (1–100) taken off the order subtotal.
 * - `fixed`      — `value` is a flat amount in minor units off the subtotal.
 */
export type DiscountType = "percentage" | "fixed";

const DISCOUNT_TYPES: readonly DiscountType[] = ["percentage", "fixed"];

/** Type guard narrowing a stored string to a known {@link DiscountType}. */
export const isDiscountType = (value: string): value is DiscountType =>
  (DISCOUNT_TYPES as readonly string[]).includes(value);
