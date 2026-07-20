import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { WalletLedgerRepository } from "../../domain/repositories/wallet-ledger-repository";

/** How many held lines the release job moved to available. */
export type ReleaseSummary = { releasedCount: number };

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

    let releasedCount = 0;
    for (const entry of due) {
      const released = entry.release();
      if (!released.ok) {
        continue;
      }
      await this.ledger.save(released.value);
      releasedCount += 1;
    }

    return ok({ releasedCount });
  }
}
