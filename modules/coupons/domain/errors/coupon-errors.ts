import { DomainError } from "@/shared/domain/domain-error";

/** Raised when a coupon is built with invalid attributes (bad code, value, …). */
export class InvalidCouponError extends DomainError {
  readonly code = "coupons/invalid-coupon";
}

/** Raised when a coupon is requested by an id or code that has no match. */
export class CouponNotFoundError extends DomainError {
  readonly code = "coupons/not-found";

  constructor(identifier: string) {
    super(`Coupon "${identifier}" was not found.`);
  }
}

/** Rejection: the coupon exists but is not published/active. */
export class CouponInactiveError extends DomainError {
  readonly code = "coupons/inactive";

  constructor() {
    super("This coupon is not active.");
  }
}

/** Rejection: the coupon's validity window has passed. */
export class CouponExpiredError extends DomainError {
  readonly code = "coupons/expired";

  constructor() {
    super("This coupon has expired.");
  }
}

/** Rejection: the order subtotal is below the coupon's minimum spend. */
export class MinSpendNotMetError extends DomainError {
  readonly code = "coupons/min-spend-not-met";

  constructor(minSpendCents: number) {
    super(`This coupon requires a minimum spend of ${minSpendCents} cents.`);
  }
}

/** Rejection: the customer has already used the coupon the maximum times. */
export class CouponUsageLimitReachedError extends DomainError {
  readonly code = "coupons/usage-limit-reached";

  constructor() {
    super("You have already used this coupon the maximum number of times.");
  }
}

/** Rejection: the order already has a coupon applied (one per order, BR-06). */
export class CouponAlreadyUsedOnOrderError extends DomainError {
  readonly code = "coupons/already-used-on-order";

  constructor() {
    super("This order already has a coupon applied.");
  }
}

/** Raised when a persisted coupon document fails domain validation on restore. */
export class CorruptCouponSnapshotError extends DomainError {
  readonly code = "coupons/corrupt-snapshot";
}
