import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { AuditTrail } from "@/shared/application/audit-trail";
import type { WalletLedgerRepository } from "../../domain/repositories/wallet-ledger-repository";
import { LedgerEntry } from "../../domain/entities/ledger-entry";

/** Input for {@link AdjustBalanceManually}: an operator credit/debit with a reason. */
export type AdjustBalanceInput = {
  operatorId: string;
  customerUid: string;
  amountCents: number;
  reason: string;
};

/**
 * Applies a manual credit (positive) or debit (negative) to a customer's wallet
 * for customer-service cases (US-G3). The reason is mandatory — the domain
 * rejects a blank one — and the action is written to the immutable audit trail
 * so who adjusted what, and why, is always reconstructable (BR-19). The credit
 * itself is just another append-only line, never an edit of history.
 */
export class AdjustBalanceManually implements UseCase<AdjustBalanceInput, void> {
  constructor(
    private readonly ledger: WalletLedgerRepository,
    private readonly audit: AuditTrail
  ) {}

  async execute(input: AdjustBalanceInput): Promise<Result<void, DomainError>> {
    const entry = LedgerEntry.manualAdjustment({
      customerUid: input.customerUid,
      amountCents: input.amountCents,
      note: input.reason,
    });
    if (!entry.ok) {
      return entry;
    }

    await this.ledger.appendIfAbsent(entry.value);
    await this.audit.record({
      actorId: input.operatorId,
      action: "rewards.manual_adjustment",
      before: null,
      after: {
        entryId: entry.value.id.value,
        customerUid: input.customerUid,
        amountCents: input.amountCents,
        reason: entry.value.note,
      },
    });

    return ok(undefined);
  }
}
