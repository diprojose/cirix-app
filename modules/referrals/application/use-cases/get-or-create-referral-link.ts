import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ReferralCodeRepository } from "../../domain/repositories/referral-code-repository";
import type { ReferralLinkDto } from "../dtos/referral-dto";

/** Input for {@link GetOrCreateReferralLink}: the referrer asking for their link. */
export type GetOrCreateReferralLinkInput = { referrerUid: string };

/**
 * Returns the referrer's stable, persistent referral code, minting it on first
 * use (US-D1, UC-13). Every call for the same referrer yields the same code, so
 * a link shared once keeps working.
 */
export class GetOrCreateReferralLink
  implements UseCase<GetOrCreateReferralLinkInput, ReferralLinkDto>
{
  constructor(private readonly codes: ReferralCodeRepository) {}

  async execute(
    input: GetOrCreateReferralLinkInput
  ): Promise<Result<ReferralLinkDto, DomainError>> {
    const code = await this.codes.getOrCreateForReferrer(input.referrerUid);
    return ok({ code });
  }
}
