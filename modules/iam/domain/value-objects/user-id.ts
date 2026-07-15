import { Identifier } from "@/shared/domain/identifier";

/**
 * UserId is the typed identity of a {@link UserAccount}. It wraps the Firebase
 * Authentication `uid` string and, being a distinct type, cannot be confused
 * with another aggregate's id at compile time.
 */
export class UserId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  /** Wraps an existing uid string (e.g. one decoded from a Firebase token). */
  static from(value: string): UserId {
    return new UserId(value);
  }
}
