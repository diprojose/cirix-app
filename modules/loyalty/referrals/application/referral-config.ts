/**
 * ReferralConfig is the tunable policy of the referral program: how much a
 * referrer earns per qualified referral and how many rewarded referrals are
 * allowed per referrer each month (BR-16). Injected into the use cases so the
 * policy has a single source; the infrastructure layer supplies the values.
 */
export type ReferralConfig = {
  referrerRewardCents: number;
  maxRewardedPerMonth: number;
};
