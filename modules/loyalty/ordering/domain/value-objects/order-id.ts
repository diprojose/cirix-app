import { Identifier } from "@/shared/domain/identifier";

/**
 * OrderId is the typed identity of an {@link Order} aggregate. It wraps a uuid
 * string and, being a distinct type, cannot be confused with another
 * aggregate's id. Guests keep this id (via the order URL) as their only handle
 * on the order, so it must be unguessable — hence a random uuid.
 */
export class OrderId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  /** Wraps an existing id string (e.g. one loaded from persistence). */
  static from(value: string): OrderId {
    return new OrderId(value);
  }

  /** Generates a brand-new random id. */
  static generate(): OrderId {
    return new OrderId(crypto.randomUUID());
  }
}
