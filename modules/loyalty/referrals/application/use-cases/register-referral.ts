import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { ReferralRepository } from "../../domain/repositories/referral-repository";
import type { ReferralCodeRepository } from "../../domain/repositories/referral-code-repository";
import { Referral } from "../../domain/entities/referral";
import { ReferralCode } from "../../domain/value-objects/referral-code";
import {
  AlreadyReferredError,
  ReferralCodeNotFoundError,
  SelfReferralError,
} from "../../domain/errors/referral-errors";

/** Input for {@link RegisterReferral}: the new user and the code they arrived with. */
export type RegisterReferralInput = {
  referredUid: string;
  code: string;
};

/**
 * Binds a newly signed-up user to the referrer whose code they arrived with
 * (US-D2, UC-02). It resolves the code, refuses a self-referral (BR-24) and
 * refuses to overwrite an existing referral (a person is referred at most once),
 * then records the link in `registrado`. No reward is granted here — that waits
 * on the referred user's purchases (BR-08).
 */
export class RegisterReferral implements UseCase<RegisterReferralInput, void> {
  constructor(
    private readonly referrals: ReferralRepository,
    private readonly codes: ReferralCodeRepository
  ) {}

  async execute(input: RegisterReferralInput): Promise<Result<void, DomainError>> {
    const code = ReferralCode.create(input.code);
    if (!code.ok) {
      return err(new ReferralCodeNotFoundError(input.code));
    }

    const referrerUid = await this.codes.resolveToReferrer(code.value.value);
    if (referrerUid === null) {
      return err(new ReferralCodeNotFoundError(input.code));
    }
    if (referrerUid === input.referredUid) {
      return err(new SelfReferralError());
    }

    const existing = await this.referrals.findByReferred(input.referredUid);
    if (existing !== null) {
      return err(new AlreadyReferredError());
    }

    const referral = Referral.create({ referrerUid, referredUid: input.referredUid });
    if (!referral.ok) {
      return referral;
    }
    await this.referrals.save(referral.value);
    return ok(undefined);
  }
}
