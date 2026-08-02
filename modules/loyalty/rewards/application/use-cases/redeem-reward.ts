import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { WalletLedgerRepository } from "../../domain/repositories/wallet-ledger-repository";
import type { RewardRulesStore } from "../../domain/ports/reward-rules-store";
import { LedgerEntry } from "../../domain/entities/ledger-entry";

/** Input for {@link RedeemReward}: how much credit to spend on which order. */
export type RedeemRewardInput = {
  customerUid: string;
  orderId: string;
  requestedCents: number;
  orderSubtotalCents: number;
};

/** How much credit was actually applied after clamping to balance and cap. */
export type RedeemRewardResult = {
  redeemedCents: number;
};

/**
 * Redeems wallet credit against an order (BR-03). The requested amount is
 * clamped to what the customer actually has available and to the per-order
 * discount cap (BR-05) — so it recorta rather than failing — and the applied
 * amount is written as a negative `burn` line. Balance is re-read at redemption
 * time to stay safe against concurrent spending. Applying nothing (no balance,
 * zero cap) is a valid no-op, not an error.
 */
export class RedeemReward implements UseCase<RedeemRewardInput, RedeemRewardResult> {
  constructor(
    private readonly ledger: WalletLedgerRepository,
    private readonly rulesStore: RewardRulesStore
  ) {}

  async execute(
    input: RedeemRewardInput
  ): Promise<Result<RedeemRewardResult, DomainError>> {
    const requested = Math.max(0, Math.floor(input.requestedCents));
    if (requested === 0) {
      return ok({ redeemedCents: 0 });
    }

    const rules = await this.rulesStore.read();
    const cap = rules.maxRedeemFor(input.orderSubtotalCents);
    const available = await this.availableBalance(input.customerUid);

    const applied = Math.min(requested, available, cap);
    if (applied <= 0) {
      return ok({ redeemedCents: 0 });
    }

    const burn = LedgerEntry.burn({
      customerUid: input.customerUid,
      amountCents: applied,
      orderId: input.orderId,
    });
    if (!burn.ok) {
      return burn;
    }

    await this.ledger.appendIfAbsent(burn.value);
    return ok({ redeemedCents: applied });
  }

  /** Sum of the customer's currently-spendable lines. */
  private async availableBalance(customerUid: string): Promise<number> {
    const entries = await this.ledger.findByCustomer(customerUid);
    return entries.reduce((total, entry) => total + entry.availableCents, 0);
  }
}
