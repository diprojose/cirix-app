import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { WalletLedgerRepository } from "../../domain/repositories/wallet-ledger-repository";

/** How many available lines the expiry job timed out. */
export type ExpireSummary = { expiredCount: number };

/** Upper bound on lines processed per run, keeping a single job bounded. */
const BATCH_LIMIT = 500;

/**
 * Expires unused credit that has reached its expiry date (BR-04): a job that
 * finds `available` earn lines past `expiresAt` and moves them to `expired`, so
 * they stop counting toward the balance and the liability shrinks. Forcing
 * frequency and capping the outstanding liability is the point of expiry.
 */
export class ExpireRewards implements UseCase<void, ExpireSummary> {
  constructor(private readonly ledger: WalletLedgerRepository) {}

  async execute(): Promise<Result<ExpireSummary, DomainError>> {
    const now = new Date().toISOString();
    const due = await this.ledger.findExpirable(now, BATCH_LIMIT);

    let expiredCount = 0;
    for (const entry of due) {
      const expired = entry.expire();
      if (!expired.ok) {
        continue;
      }
      await this.ledger.save(expired.value);
      expiredCount += 1;
    }

    return ok({ expiredCount });
  }
}
