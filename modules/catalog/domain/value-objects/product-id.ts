import { Identifier } from "@/shared/domain/identifier";

/**
 * ProductId is the typed identity of a {@link Product} aggregate. It wraps a
 * uuid string and, being a distinct type, cannot be confused with another
 * aggregate's id at compile time.
 */
export class ProductId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  /** Wraps an existing id string (e.g. one loaded from persistence). */
  static from(value: string): ProductId {
    return new ProductId(value);
  }

  /** Generates a brand-new random id. */
  static generate(): ProductId {
    return new ProductId(crypto.randomUUID());
  }
}
