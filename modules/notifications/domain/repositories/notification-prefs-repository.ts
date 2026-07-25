import type { NotificationPrefs } from "../entities/notification-prefs";

/**
 * NotificationPrefsRepository is the persistence port for a customer's channel
 * preferences. `findByCustomer` returns `null` when none are stored, and callers
 * fall back to the defaults — so a customer always has effective prefs.
 */
export interface NotificationPrefsRepository {
  /** The customer's stored prefs, or `null` when they have none yet. */
  findByCustomer(customerUid: string): Promise<NotificationPrefs | null>;

  /** Inserts or replaces a customer's prefs. */
  save(prefs: NotificationPrefs): Promise<void>;
}
