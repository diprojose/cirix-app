import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { WalletLedgerRepository } from "../../domain/repositories/wallet-ledger-repository";
import type { RewardRulesStore } from "../../domain/ports/reward-rules-store";
import { LedgerEntry } from "../../domain/entities/ledger-entry";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Input for {@link AccruePurchaseReward}. Margin comes from the confirmed order. */
export type AccruePurchaseRewardInput = {
  orderId: string;
  customerUid: string | null;
  marginCents: number;
};

/**
 * Accrues loyalty credit when an order is confirmed: it reads the current rules,
 * takes the configured percentage of the order margin (BR-01) and appends a
 * `pending` earn line with a holdback and an expiry (BR-02, BR-04). The write is
 * idempotent on the order id, so confirming the same order twice never earns
 * twice (BR-11). Guests (no uid) and zero-margin orders simply earn nothing —
 * both are ordinary outcomes, not failures.
 */
export class AccruePurchaseReward
  implements UseCase<AccruePurchaseRewardInput, void>
{
  constructor(
    private readonly ledger: WalletLedgerRepository,
    private readonly rulesStore: RewardRulesStore
  ) {}

  async execute(input: AccruePurchaseRewardInput): Promise<Result<void, DomainError>> {
    const customerUid = (input.customerUid ?? "").trim();
    if (customerUid.length === 0) {
      return ok(undefined);
    }

    const rules = await this.rulesStore.read();
    const earnCents = rules.earnFor(input.marginCents);
    if (earnCents <= 0) {
      return ok(undefined);
    }

    const now = Date.now();
    const entry = LedgerEntry.earn({
      customerUid,
      amountCents: earnCents,
      orderId: input.orderId,
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
