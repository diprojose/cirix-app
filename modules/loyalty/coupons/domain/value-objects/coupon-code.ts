import { ValueObject } from "@/shared/domain/value-object";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { InvalidCouponError } from "../errors/coupon-errors";

/** Props backing a {@link CouponCode} value object. */
type CouponCodeProps = {
  readonly value: string;
};

/** Codes are normalized to this shape: 3–24 chars, upper-case letters, digits and dashes. */
const CODE_PATTERN = /^[A-Z0-9-]{3,24}$/;

/**
 * CouponCode is the immutable, normalized code a customer types at checkout
 * (e.g. "BIENVENIDA10"). Normalization to upper-case makes matching
 * case-insensitive, and the charset/length check keeps codes shareable and
 * unambiguous. An invalid code cannot exist.
 */
export class CouponCode extends ValueObject<CouponCodeProps> {
  private constructor(props: CouponCodeProps) {
    super(props);
  }

  /** Builds a normalized code, failing with a Result on an invalid one. */
  static create(raw: string): Result<CouponCode, DomainError> {
    const normalized = raw.trim().toUpperCase();
    if (!CODE_PATTERN.test(normalized)) {
      return err(
        new InvalidCouponError(
          "Coupon code must be 3–24 characters: letters, digits or dashes."
        )
      );
    }
    return ok(new CouponCode({ value: normalized }));
  }

  get value(): string {
    return this.props.value;
  }
}
