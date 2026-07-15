import { Identifier } from "@/shared/domain/identifier";

/**
 * DessertId is the typed identity of a {@link Dessert} aggregate. It wraps a
 * uuid string and, being a distinct type, cannot be confused with another
 * aggregate's id at compile time.
 */
export class DessertId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  /** Wraps an existing id string (e.g. one loaded from persistence). */
  static from(value: string): DessertId {
    return new DessertId(value);
  }

  /** Generates a brand-new random id. */
  static generate(): DessertId {
    return new DessertId(crypto.randomUUID());
  }
}
