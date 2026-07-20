import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ReferralRepository } from "../../domain/repositories/referral-repository";
import type { ReferrerRewarder } from "../../domain/ports/referrer-rewarder";

/** Input for {@link ReverseReferralOnOrderCancel}: the cancelled order. */
export type ReverseReferralOnOrderCancelInput = { orderId: string };

/** Whether a referral reward was clawed back. */
export type ReverseReferralSummary = { reversed: boolean };

/**
 * Undoes a referral reward when the second (reward-triggering) purchase is
 * cancelled (UC-14 E3): it finds the referral whose second purchase is this
 * order, claws back the referrer's reward and rolls the referral back to
 * `primera_compra` so a later genuine second purchase can unlock it again. A
 * no-op for orders that never triggered a referral reward.
 */
export class ReverseReferralOnOrderCancel
  implements UseCase<ReverseReferralOnOrderCancelInput, ReverseReferralSummary>
{
  constructor(
    private readonly referrals: ReferralRepository,
    private readonly rewarder: ReferrerRewarder
  ) {}

  async execute(
    input: ReverseReferralOnOrderCancelInput
  ): Promise<Result<ReverseReferralSummary, DomainError>> {
    const referral = await this.referrals.findBySecondPurchaseOrder(input.orderId);
    if (referral === null) {
      return ok({ reversed: false });
    }

    await this.rewarder.reverse({ referralId: referral.referredUid });
    await this.referrals.save(referral.rollbackSecondPurchase());
    return ok({ reversed: true });
  }
}
