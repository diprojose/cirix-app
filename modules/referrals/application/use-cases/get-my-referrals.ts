import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ReferralRepository } from "../../domain/repositories/referral-repository";
import { toReferralDto, type ReferralDto } from "../dtos/referral-dto";

/** Input for {@link GetMyReferrals}: whose referral funnel to read. */
export type GetMyReferralsInput = { referrerUid: string };

/**
 * Returns a referrer's referrals for their panel (US-D5): the state of each
 * invitee and the reward earned. Scoped strictly to the caller's own uid, so a
 * referrer only ever sees their own funnel.
 */
export class GetMyReferrals implements UseCase<GetMyReferralsInput, ReferralDto[]> {
  constructor(private readonly referrals: ReferralRepository) {}

  async execute(input: GetMyReferralsInput): Promise<Result<ReferralDto[], DomainError>> {
    const referrals = await this.referrals.findByReferrer(input.referrerUid);
    return ok(referrals.map(toReferralDto));
  }
}
