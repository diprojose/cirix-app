import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ReferralRepository } from "../../domain/repositories/referral-repository";
import type { ReferrerRewarder } from "../../domain/ports/referrer-rewarder";

/** Input for {@link BlockReferral}: the referral to block (keyed by referred uid). */
export type BlockReferralInput = { referralId: string };

/**
 * Blocks a referral flagged as fraudulent (BR-09): it claws back any reward the
 * referrer earned and moves the referral to `bloqueado`, from which it never
 * pays out. Invoked by fraud review. A no-op for an unknown referral, so it is
 * safe to call from an alert whose subject may have since changed.
 */
export class BlockReferral implements UseCase<BlockReferralInput, void> {
  constructor(
    private readonly referrals: ReferralRepository,
    private readonly rewarder: ReferrerRewarder
  ) {}

  async execute(input: BlockReferralInput): Promise<Result<void, DomainError>> {
    const referral = await this.referrals.findByReferred(input.referralId);
    if (referral === null) {
      return ok(undefined);
    }
    await this.rewarder.reverse({ referralId: input.referralId });
    await this.referrals.save(referral.block());
    return ok(undefined);
  }
}
