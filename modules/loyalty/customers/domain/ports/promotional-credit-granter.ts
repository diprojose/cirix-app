/**
 * PromotionalCreditGranter is the outbound port the retention context uses to
 * pay a streak bonus or win-back incentive, without depending on the rewards
 * module directly. An infrastructure adapter implements it by appending a
 * promotional wallet line. The `entryId` makes each grant idempotent, so a
 * re-run of a retention job never double-pays.
 */
export interface PromotionalCreditGranter {
  grant(input: {
    entryId: string;
    customerUid: string;
    amountCents: number;
    note: string;
    expiryDays: number;
  }): Promise<void>;
}
