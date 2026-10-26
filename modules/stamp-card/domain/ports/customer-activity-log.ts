/** Things this module reports to the customer's timeline. */
export type ActivityType = "stamp_added" | "reward_unlocked" | "reward_redeemed";

/**
 * CustomerActivityLog writes to the shared customer timeline. A stable
 * `eventId` makes a retried write harmless. Recording is best-effort: the card
 * is the source of truth, and a timeline failure must never undo a stamp.
 */
export interface CustomerActivityLog {
  record(input: {
    businessId: string;
    userId: string;
    type: ActivityType;
    eventId: string;
    data: Record<string, string | number | boolean | null>;
  }): Promise<void>;
}
