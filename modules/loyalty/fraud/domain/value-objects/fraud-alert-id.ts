import { Identifier } from "@/shared/domain/identifier";

/**
 * FraudAlertId is the typed identity of a {@link FraudAlert}. It wraps a uuid
 * string and, being a distinct type, cannot be confused with another
 * aggregate's id at compile time.
 */
export class FraudAlertId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  /** Wraps an existing id string (e.g. one loaded from persistence). */
  static from(value: string): FraudAlertId {
    return new FraudAlertId(value);
  }

  /** Generates a brand-new random id. */
  static generate(): FraudAlertId {
    return new FraudAlertId(crypto.randomUUID());
  }
}
