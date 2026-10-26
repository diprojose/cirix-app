import { Identifier } from "@/shared/domain/identifier";

/**
 * BusinessId is the typed identity of a {@link Business}. It is the tenant key:
 * every piece of business-owned data is scoped by it, and it is always derived
 * on the server from the session and the slug, never taken from client input.
 */
export class BusinessId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  /** Wraps an existing id string (e.g. one loaded from persistence). */
  static from(value: string): BusinessId {
    return new BusinessId(value);
  }

  /** Generates a brand-new random id. */
  static generate(): BusinessId {
    return new BusinessId(crypto.randomUUID());
  }
}
