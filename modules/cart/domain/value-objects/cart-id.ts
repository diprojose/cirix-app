import { Identifier } from "@/shared/domain/identifier";

/**
 * CartId is the typed identity of a {@link Cart} aggregate. It wraps a uuid
 * string and, being a distinct type, cannot be confused with another aggregate's
 * id. A guest cart generates one on creation and keeps it in its persisted
 * snapshot, so the same identity survives across sessions (and is ready for a
 * future server-backed adapter).
 */
export class CartId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  /** Wraps an existing id string (e.g. one loaded from persistence). */
  static from(value: string): CartId {
    return new CartId(value);
  }

  /** Generates a brand-new random id. */
  static generate(): CartId {
    return new CartId(crypto.randomUUID());
  }
}
