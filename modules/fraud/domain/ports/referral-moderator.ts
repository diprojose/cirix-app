/**
 * ReferralModerator is the outbound port the fraud context uses to act on a
 * referral it has judged fraudulent, without depending on the referrals module
 * directly. An infrastructure adapter implements it by driving the referrals
 * context (block the referral and claw back the reward).
 */
export interface ReferralModerator {
  /** Blocks the referral with the given id and reverses any reward paid. */
  block(referralId: string): Promise<void>;
}
