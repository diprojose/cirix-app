import type { ReferralConfig } from "../../application/referral-config";

/**
 * The referral program's out-of-the-box policy: how much a referrer earns per
 * qualified referral and the monthly cap on rewarded referrals (BR-16). Kept as
 * a constant for now; a future admin panel can make it operator-tunable like the
 * reward rules.
 */
export const DEFAULT_REFERRAL_CONFIG: ReferralConfig = {
  referrerRewardCents: 200,
  maxRewardedPerMonth: 10,
};
