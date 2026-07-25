import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { WalletLedgerRepository } from "../../domain/repositories/wallet-ledger-repository";
import { LedgerEntryId } from "../../domain/value-objects/ledger-entry-id";

/** Input for {@link ReverseReferralReward}: the referral whose reward to claw back. */
export type ReverseReferralRewardInput = { referralId: string };

/**
 * Reverses a referrer's reward when the qualifying purchase is undone (UC-14 E3):
 * it flips the referral line — pending or already available — to `reversed`.
 * Addressed by its deterministic id, so it needs no query and is idempotent
 * (reversing an absent or already-reversed line is a no-op).
 */
export class ReverseReferralReward implements UseCase<ReverseReferralRewardInput, void> {
  constructor(private readonly ledger: WalletLedgerRepository) {}

  async execute(input: ReverseReferralRewardInput): Promise<Result<void, DomainError>> {
    const entry = await this.ledger.findById(LedgerEntryId.forReferral(input.referralId));
    if (entry === null) {
      return ok(undefined);
    }
    const reversed = entry.reverse();
    if (reversed.ok) {
      await this.ledger.save(reversed.value);
    }
    return ok(undefined);
  }
}
