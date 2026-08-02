/**
 * The lifecycle state of a ledger line. Adapted from the reward state machine in
 * the spec to an append-only, separate-line model:
 * - `pending`   — earned but inside the holdback window; not yet spendable (BR-02).
 * - `available` — spendable now. Earn lines reach it after holdback; burn,
 *                 adjustment and reversal lines are born here (already settled).
 * - `reversed`  — clawed back by a refund/fraud; contributes nothing (BR-12).
 * - `expired`   — an available earn line that timed out unused (BR-04).
 *
 * There is deliberately no `redeemed` state: spending credit appends a distinct
 * negative `burn_redemption` line instead of mutating the earn line, keeping the
 * ledger append-only (BR-13). A line's economic content never changes; only its
 * status advances along the transitions below.
 */
export type LedgerStatus = "pending" | "available" | "reversed" | "expired";

const LEDGER_STATUSES: readonly LedgerStatus[] = [
  "pending",
  "available",
  "reversed",
  "expired",
];

/** Type guard narrowing a stored string to a known {@link LedgerStatus}. */
export const isLedgerStatus = (value: string): value is LedgerStatus =>
  (LEDGER_STATUSES as readonly string[]).includes(value);

/** Allowed status transitions; every other move is rejected by the entity. */
const TRANSITIONS: Record<LedgerStatus, readonly LedgerStatus[]> = {
  pending: ["available", "reversed"],
  available: ["reversed", "expired"],
  reversed: [],
  expired: [],
};

/** Whether a line may move from `from` to `to`. */
export const canTransition = (from: LedgerStatus, to: LedgerStatus): boolean =>
  TRANSITIONS[from].includes(to);
