import { Identifier } from "@/shared/domain/identifier";

/**
 * CouponId is the typed identity of a {@link Coupon} aggregate. It wraps a uuid
 * string and, being a distinct type, cannot be confused with another
 * aggregate's id at compile time.
 */
export class CouponId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  /** Wraps an existing id string (e.g. one loaded from persistence). */
  static from(value: string): CouponId {
    return new CouponId(value);
  }

  /** Generates a brand-new random id. */
  static generate(): CouponId {
    return new CouponId(crypto.randomUUID());
  }
}
