import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { WalletLedgerRepository } from "../../domain/repositories/wallet-ledger-repository";
import { LedgerEntryId } from "../../domain/value-objects/ledger-entry-id";

/** Input for {@link ReverseOrderRewards}: the order being cancelled/refunded. */
export type ReverseOrderRewardsInput = { orderId: string };

/** What the reversal touched, for logging/notification. */
export type ReverseSummary = { reversedEarn: boolean; reversedBurn: boolean };

/**
 * Reverses an order's reward effects when the order is cancelled (Cirix Tech Platform's
 * refund trigger, BR-12). It reverses the order's earn line — whether still
 * `pending` or already `available` — and, if the customer had spent credit on
 * this order, reverses that `burn` line too, returning the credit to their
 * wallet. Both lines are addressed by their deterministic ids, so the reversal
 * needs no query and is itself idempotent (re-reversing a `reversed` line is a
 * no-op). Per UC-07, if the earned credit was already spent elsewhere the
 * balance may go temporarily negative until future earn compensates.
 */
export class ReverseOrderRewards
  implements UseCase<ReverseOrderRewardsInput, ReverseSummary>
{
  constructor(private readonly ledger: WalletLedgerRepository) {}

  async execute(
    input: ReverseOrderRewardsInput
  ): Promise<Result<ReverseSummary, DomainError>> {
    const reversedEarn = await this.reverse(LedgerEntryId.forEarn(input.orderId));
    const reversedBurn = await this.reverse(LedgerEntryId.forBurn(input.orderId));
    return ok({ reversedEarn, reversedBurn });
  }

  /** Reverses one line if it exists and its lifecycle still allows it. */
  private async reverse(id: LedgerEntryId): Promise<boolean> {
    const entry = await this.ledger.findById(id);
    if (entry === null) {
      return false;
    }
    const reversed = entry.reverse();
    if (!reversed.ok) {
      return false;
    }
    await this.ledger.save(reversed.value);
    return true;
  }
}
