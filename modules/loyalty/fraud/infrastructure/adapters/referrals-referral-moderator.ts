import type { ReferralModerator } from "../../domain/ports/referral-moderator";
import { makeBlockReferral } from "@/modules/loyalty/referrals/infrastructure/di/referrals-container";

/**
 * ReferralsReferralModerator implements the fraud context's
 * {@link ReferralModerator} port by driving the referrals module: blocking a
 * referral flags it and reverses the referrer's reward. This adapter is where
 * the two bounded contexts meet, keeping the fraud domain unaware of how
 * referrals are stored or rewarded.
 */
export class ReferralsReferralModerator implements ReferralModerator {
  async block(referralId: string): Promise<void> {
    await makeBlockReferral().execute({ referralId });
  }
}
