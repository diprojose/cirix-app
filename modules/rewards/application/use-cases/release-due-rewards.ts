import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { WalletLedgerRepository } from "../../domain/repositories/wallet-ledger-repository";

/** One credit line that was just released, for downstream notification. */
export type ReleasedLine = { customerUid: string; amountCents: number };

/** How many held lines the release job moved to available, and to whom. */
export type ReleaseSummary = { releasedCount: number; released: ReleasedLine[] };

/** Upper bound on lines processed per run, keeping a single job bounded. */
const BATCH_LIMIT = 500;

/**
 * Releases earned credit whose holdback has elapsed (BR-02): a job that finds
 * `pending` lines past their holdback and moves them to `available` so the
 * customer can spend them. Cancelled orders reverse their earn line eagerly, so
 * anything still `pending` here is safe to release without re-checking the order.
 */
export class ReleaseDueRewards implements UseCase<void, ReleaseSummary> {
  constructor(private readonly ledger: WalletLedgerRepository) {}

  async execute(): Promise<Result<ReleaseSummary, DomainError>> {
    const now = new Date().toISOString();
    const due = await this.ledger.findReleasable(now, BATCH_LIMIT);

    const released: ReleasedLine[] = [];
    for (const entry of due) {
      const result = entry.release();
      if (!result.ok) {
        continue;
      }
      await this.ledger.save(result.value);
      released.push({ customerUid: result.value.customerUid, amountCents: result.value.amountCents });
    }

    return ok({ releasedCount: released.length, released });
  }
}
