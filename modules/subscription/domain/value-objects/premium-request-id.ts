import { Identifier } from "@/shared/domain/identifier";

/**
 * PremiumRequestId is the typed identity of a {@link PremiumRequest}. Being a
 * distinct type, it cannot be confused with another aggregate's id at compile
 * time.
 */
export class PremiumRequestId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  /** Wraps an existing id string (e.g. one loaded from persistence). */
  static from(value: string): PremiumRequestId {
    return new PremiumRequestId(value);
  }

  /** Generates a brand-new random id. */
  static generate(): PremiumRequestId {
    return new PremiumRequestId(crypto.randomUUID());
  }
}
