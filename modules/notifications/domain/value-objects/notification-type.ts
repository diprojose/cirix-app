/**
 * What a notification is about:
 * - `credit_available` — held credit was released and is now spendable (US-H1).
 * - `credit_expiring`  — available credit is about to expire (US-H2).
 * - `referral_reward`  — a referral unlocked the referrer's reward (US-H3).
 * - `promotion`        — a retention bonus (streak or win-back) landed.
 * - `general`          — anything else.
 */
export type NotificationType =
  | "credit_available"
  | "credit_expiring"
  | "referral_reward"
  | "promotion"
  | "general";

const NOTIFICATION_TYPES: readonly NotificationType[] = [
  "credit_available",
  "credit_expiring",
  "referral_reward",
  "promotion",
  "general",
];

/** Type guard narrowing a stored string to a known {@link NotificationType}. */
export const isNotificationType = (value: string): value is NotificationType =>
  (NOTIFICATION_TYPES as readonly string[]).includes(value);
