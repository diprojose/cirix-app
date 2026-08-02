import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { WalletLedgerRepository } from "../../domain/repositories/wallet-ledger-repository";
import { LedgerEntry } from "../../domain/entities/ledger-entry";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Input for {@link GrantPromotionalCredit}: a retention bonus for one customer. */
export type GrantPromotionalCreditInput = {
  /** Deterministic id so the same bonus is never granted twice (e.g. streak_<uid>_<week>). */
  entryId: string;
  customerUid: string;
  amountCents: number;
  note: string;
  expiryDays: number;
};

/**
 * Grants a promotional bonus as store credit — a streak reward (BR-25) or a
 * win-back incentive (BR-17). The credit is available immediately with a short
 * expiry, and the write is idempotent on the caller-supplied id so re-running a
 * retention job never double-grants (BR-11). A non-positive amount is a no-op.
 */
export class GrantPromotionalCredit
  implements UseCase<GrantPromotionalCreditInput, void>
{
  constructor(private readonly ledger: WalletLedgerRepository) {}

  async execute(input: GrantPromotionalCreditInput): Promise<Result<void, DomainError>> {
    if (input.amountCents <= 0) {
      return ok(undefined);
    }

    const entry = LedgerEntry.promotion({
      entryId: input.entryId,
      customerUid: input.customerUid,
      amountCents: input.amountCents,
      note: input.note,
      expiresAt: new Date(Date.now() + input.expiryDays * MS_PER_DAY).toISOString(),
    });
    if (!entry.ok) {
      return entry;
    }

    await this.ledger.appendIfAbsent(entry.value);
    return ok(undefined);
  }
}
