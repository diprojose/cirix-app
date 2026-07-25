/**
 * ReferrerRewarder is the outbound port the referrals context uses to pay a
 * referrer without depending on the rewards module directly. An infrastructure
 * adapter implements it by driving the wallet ledger. Keeping it a port means
 * referrals stays a self-contained bounded context — it knows "reward the
 * referrer", not how credit is stored.
 */
export interface ReferrerRewarder {
  /** Grants the referrer their reward for a qualified referral (idempotent by referral). */
  award(input: {
    referrerUid: string;
    referralId: string;
    amountCents: number;
  }): Promise<void>;

  /** Claws back a referrer's reward when the qualifying purchase is undone. */
  reverse(input: { referralId: string }): Promise<void>;
}
