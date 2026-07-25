import type { CouponRedemption } from "../entities/coupon-redemption";

/** The outcome of an atomic redemption attempt. */
export type RecordRedemptionOutcome = "recorded" | "over-limit" | "duplicate-order";

/**
 * CouponRedemptionRepository is the persistence port for coupon usage. Its
 * `record` is the consistency boundary that makes the per-customer usage limit
 * (BR-15) and one-coupon-per-order (BR-06) safe under concurrency — the adapter
 * enforces both atomically, so two simultaneous checkouts cannot both slip past
 * the last allowed use. Reversal frees a use without deleting the audit record.
 */
export interface CouponRedemptionRepository {
  /** The redemption recorded against an order, or `null` if none. */
  findByOrder(orderId: string): Promise<CouponRedemption | null>;

  /**
   * How many live redemptions a customer has for a coupon — the number the
   * usage limit is compared against. Used for the checkout preview; the
   * authoritative check happens inside `record`.
   */
  countActiveByCustomer(couponId: string, customerUid: string): Promise<number>;

  /**
   * Atomically records a redemption, rejecting it when the order already has one
   * (`duplicate-order`) or when the customer has reached the per-customer usage
   * limit (`over-limit`). `usageLimitPerCustomer` is `null` for unlimited.
   */
  record(
    redemption: CouponRedemption,
    usageLimitPerCustomer: number | null
  ): Promise<RecordRedemptionOutcome>;

  /**
   * Reverses the redemption tied to an order, freeing the use. Returns whether a
   * live redemption was reversed (idempotent: reversing an absent or already
   * reversed one returns `false`).
   */
  reverseByOrder(orderId: string): Promise<boolean>;
}
