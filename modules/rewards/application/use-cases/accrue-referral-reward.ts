import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { WalletLedgerRepository } from "../../domain/repositories/wallet-ledger-repository";
import type { RewardRulesStore } from "../../domain/ports/reward-rules-store";
import { LedgerEntry } from "../../domain/entities/ledger-entry";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Input for {@link AccrueReferralReward}: who to reward and how much, for which referral. */
export type AccrueReferralRewardInput = {
  referrerUid: string;
  referralId: string;
  amountCents: number;
};

/**
 * Accrues a referrer's reward when their referral qualifies (BR-08). It appends
 * a `pending` referral line with the configured holdback and expiry (BR-02,
 * BR-04) — released and expired by the same jobs as any other credit. The write
 * is idempotent on the referral id, so a re-triggered unlock never rewards twice
 * (BR-11). A non-positive amount is a no-op.
 */
export class AccrueReferralReward implements UseCase<AccrueReferralRewardInput, void> {
  constructor(
    private readonly ledger: WalletLedgerRepository,
    private readonly rulesStore: RewardRulesStore
  ) {}

  async execute(input: AccrueReferralRewardInput): Promise<Result<void, DomainError>> {
    if (input.amountCents <= 0) {
      return ok(undefined);
    }

    const rules = await this.rulesStore.read();
    const now = Date.now();
    const entry = LedgerEntry.referral({
      referrerUid: input.referrerUid,
      amountCents: input.amountCents,
      referralId: input.referralId,
      holdbackUntil: new Date(now + rules.holdbackDays * MS_PER_DAY).toISOString(),
      expiresAt: new Date(now + rules.expiryDays * MS_PER_DAY).toISOString(),
    });
    if (!entry.ok) {
      return entry;
    }

    await this.ledger.appendIfAbsent(entry.value);
    return ok(undefined);
  }
}
