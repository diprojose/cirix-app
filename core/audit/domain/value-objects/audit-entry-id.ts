import { Identifier } from "@/shared/domain/identifier";

/**
 * AuditEntryId is the typed identity of an {@link AuditEntry}. It wraps a uuid
 * string and, being a distinct type, cannot be confused with another
 * aggregate's id at compile time.
 */
export class AuditEntryId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  /** Wraps an existing id string (e.g. one loaded from persistence). */
  static from(value: string): AuditEntryId {
    return new AuditEntryId(value);
  }

  /** Generates a brand-new random id. */
  static generate(): AuditEntryId {
    return new AuditEntryId(crypto.randomUUID());
  }
}
