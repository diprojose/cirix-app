import type { Notification } from "../entities/notification";

/**
 * NotificationRepository is the persistence port for in-app notifications. It is
 * always scoped by customer — a notification belongs to exactly one recipient —
 * and offers a dedupe lookup so an event notifies at most once (BR-11-style
 * idempotency for the inbox).
 */
export interface NotificationRepository {
  /** A customer's notifications, newest first, bounded by the adapter. */
  findByCustomer(customerUid: string): Promise<Notification[]>;

  /** An existing notification with the given dedupe key for a customer, or `null`. */
  findByDedupeKey(customerUid: string, dedupeKey: string): Promise<Notification | null>;

  /** Inserts or replaces a notification by id. */
  save(notification: Notification): Promise<void>;

  /** Marks every one of a customer's notifications read. */
  markAllRead(customerUid: string): Promise<void>;
}
