import { Identifier } from "@/shared/domain/identifier";

/**
 * ReferralId is the typed identity of a {@link Referral}. A person is referred at
 * most once, so the referral is naturally keyed by the **referred** user's uid —
 * that is this id's value. It makes "find the referral this user was invited
 * through" a direct lookup and guarantees one referral per referred user.
 */
export class ReferralId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  /** Wraps a referred user's uid as the referral identity. */
  static from(referredUid: string): ReferralId {
    return new ReferralId(referredUid);
  }
}
