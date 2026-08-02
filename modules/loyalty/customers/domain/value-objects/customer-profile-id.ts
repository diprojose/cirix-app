import { Identifier } from "@/shared/domain/identifier";

/**
 * CustomerProfileId is the typed identity of a {@link CustomerProfile}. A profile
 * belongs to exactly one signed-in customer, so it is keyed by their Firebase
 * uid — that is this id's value.
 */
export class CustomerProfileId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  /** Wraps a customer's uid as the profile identity. */
  static from(uid: string): CustomerProfileId {
    return new CustomerProfileId(uid);
  }
}
