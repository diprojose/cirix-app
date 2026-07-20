/**
 * Why a ledger line exists. Every line carries exactly one reason, fixed at
 * creation and never changed (BR-13):
 * - `earn_purchase`   — credit earned from a confirmed order's margin (BR-01).
 * - `burn_redemption` — credit spent on a future order (a negative line, BR-03).
 * - `reversal_refund` — credit clawed back because an order was cancelled (BR-12).
 * - `manual_adjustment` — an operator credit/debit for customer service (US-G3).
 * - `referral_reward` — credit a referrer earns when their referral qualifies (BR-08).
 * - `promotion` — a retention bonus (a streak bonus BR-25 or a win-back BR-17).
 */
export type RewardReason =
  | "earn_purchase"
  | "burn_redemption"
  | "reversal_refund"
  | "manual_adjustment"
  | "referral_reward"
  | "promotion";

const REWARD_REASONS: readonly RewardReason[] = [
  "earn_purchase",
  "burn_redemption",
  "reversal_refund",
  "manual_adjustment",
  "referral_reward",
  "promotion",
];

/** Type guard narrowing a stored string to a known {@link RewardReason}. */
export const isRewardReason = (value: string): value is RewardReason =>
  (REWARD_REASONS as readonly string[]).includes(value);
