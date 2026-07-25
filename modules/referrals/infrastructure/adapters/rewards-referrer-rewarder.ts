import type { ReferrerRewarder } from "../../domain/ports/referrer-rewarder";
import {
  makeAccrueReferralReward,
  makeReverseReferralReward,
} from "@/modules/rewards/infrastructure/di/rewards-container";

/**
 * RewardsReferrerRewarder implements the referrals context's
 * {@link ReferrerRewarder} port by driving the rewards module: a referrer's
 * reward is just another wallet ledger line. This adapter is where the two
 * bounded contexts meet, so the referrals domain and application layers stay
 * unaware of how credit is stored.
 */
export class RewardsReferrerRewarder implements ReferrerRewarder {
  async award(input: {
    referrerUid: string;
    referralId: string;
    amountCents: number;
  }): Promise<void> {
    await makeAccrueReferralReward().execute(input);
  }

  async reverse(input: { referralId: string }): Promise<void> {
    await makeReverseReferralReward().execute(input);
  }
}
