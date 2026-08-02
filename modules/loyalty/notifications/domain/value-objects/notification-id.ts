import { Identifier } from "@/shared/domain/identifier";

/**
 * NotificationId is the typed identity of a {@link Notification}. It wraps a uuid
 * string and, being a distinct type, cannot be confused with another
 * aggregate's id at compile time.
 */
export class NotificationId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  /** Wraps an existing id string (e.g. one loaded from persistence). */
  static from(value: string): NotificationId {
    return new NotificationId(value);
  }

  /** Generates a brand-new random id. */
  static generate(): NotificationId {
    return new NotificationId(crypto.randomUUID());
  }
}
