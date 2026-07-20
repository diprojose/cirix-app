import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ReferralRepository } from "../../domain/repositories/referral-repository";
import type { ReferrerRewarder } from "../../domain/ports/referrer-rewarder";
import type { ReferralConfig } from "../referral-config";

/** Input for {@link RecordReferredPurchase}: a confirmed order and who placed it. */
export type RecordReferredPurchaseInput = {
  referredUid: string;
  orderId: string;
};

/** Whether this purchase unlocked and paid the referrer's reward. */
export type RecordReferredPurchaseResult = { awarded: boolean };

/**
 * Advances a referral one confirmed purchase at a time (US-D3, US-D4, UC-14). A
 * referred user's first order moves the referral to `primera_compra`; their
 * second unlocks the referrer's reward (BR-08) — subject to the per-month cap
 * (BR-16), above which the referral still advances but pays nothing. Buyers who
 * were never referred, and purchases past the second, are no-ops. Each order is
 * recorded by id, so a re-confirmed order never advances the machine twice.
 */
export class RecordReferredPurchase
  implements UseCase<RecordReferredPurchaseInput, RecordReferredPurchaseResult>
{
  constructor(
    private readonly referrals: ReferralRepository,
    private readonly rewarder: ReferrerRewarder,
    private readonly config: ReferralConfig
  ) {}

  async execute(
    input: RecordReferredPurchaseInput
  ): Promise<Result<RecordReferredPurchaseResult, DomainError>> {
    const referral = await this.referrals.findByReferred(input.referredUid);
    if (referral === null) {
      return ok({ awarded: false });
    }

    if (referral.state === "registrado") {
      await this.referrals.save(referral.recordFirstPurchase(input.orderId));
      return ok({ awarded: false });
    }

    const isSecondPurchase =
      referral.state === "primera_compra" &&
      input.orderId !== referral.firstPurchaseOrderId;
    if (!isSecondPurchase) {
      return ok({ awarded: false });
    }

    // Second purchase: unlock the reward unless the referrer hit the monthly cap.
    const rewardCents = (await this.underMonthlyCap(referral.referrerUid))
      ? this.config.referrerRewardCents
      : 0;
    await this.referrals.save(referral.recordSecondPurchase(input.orderId, rewardCents));

    if (rewardCents > 0) {
      await this.rewarder.award({
        referrerUid: referral.referrerUid,
        referralId: referral.referredUid,
        amountCents: rewardCents,
      });
    }
    return ok({ awarded: rewardCents > 0 });
  }

  /** Whether the referrer is below their rewarded-referrals cap for the current month. */
  private async underMonthlyCap(referrerUid: string): Promise<boolean> {
    const month = new Date().toISOString().slice(0, 7);
    const referrals = await this.referrals.findByReferrer(referrerUid);
    const rewardedThisMonth = referrals.filter(
      (r) =>
        (r.rewardCents ?? 0) > 0 &&
        r.secondPurchaseAt !== null &&
        r.secondPurchaseAt.slice(0, 7) === month
    ).length;
    return rewardedThisMonth < this.config.maxRewardedPerMonth;
  }
}
