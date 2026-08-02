/**
 * The review state of a fraud alert:
 * - `pending`  — awaiting an analyst's decision.
 * - `approved` — reviewed and cleared (no action taken).
 * - `blocked`  — confirmed fraud; the subject was blocked and any reward reversed.
 */
export type FraudStatus = "pending" | "approved" | "blocked";

const FRAUD_STATUSES: readonly FraudStatus[] = ["pending", "approved", "blocked"];

/** Type guard narrowing a stored string to a known {@link FraudStatus}. */
export const isFraudStatus = (value: string): value is FraudStatus =>
  (FRAUD_STATUSES as readonly string[]).includes(value);
