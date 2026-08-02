import { ValueObject } from "@/shared/domain/value-object";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import { InvalidReferralError } from "../errors/referral-errors";

/** Props backing a {@link ReferralCode} value object. */
type ReferralCodeProps = {
  readonly value: string;
};

/** Codes are 4–12 chars of upper-case letters and digits (short and shareable). */
const CODE_PATTERN = /^[A-Z0-9]{4,12}$/;

/**
 * ReferralCode is the normalized, shareable code embedded in a referrer's link.
 * Normalizing to upper-case makes it case-insensitive to type, and the
 * charset/length keeps it short and unambiguous. An invalid code cannot exist.
 */
export class ReferralCode extends ValueObject<ReferralCodeProps> {
  private constructor(props: ReferralCodeProps) {
    super(props);
  }

  /** Builds a normalized code, failing with a Result on an invalid one. */
  static create(raw: string): Result<ReferralCode, DomainError> {
    const normalized = raw.trim().toUpperCase();
    if (!CODE_PATTERN.test(normalized)) {
      return err(new InvalidReferralError("Referral code must be 4–12 letters or digits."));
    }
    return ok(new ReferralCode({ value: normalized }));
  }

  get value(): string {
    return this.props.value;
  }
}
