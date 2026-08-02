import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { WalletLedgerRepository } from "../../domain/repositories/wallet-ledger-repository";
import type { LiabilityReportDto } from "../dtos/liability-report-dto";

/** Upper bound on lines scanned for the report. */
const SCAN_LIMIT = 2000;
/** Credit expiring within this window counts as "expiring soon". */
const SOON_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Computes the outstanding points liability (US-I2): the net of every
 * `available` line — earned credit minus what has been spent — plus how much is
 * due to expire in the next 30 days. It gives the business the value it owes
 * customers at a glance, the input to budgeting and to compliance reporting.
 */
export class GetLiabilityReport implements UseCase<void, LiabilityReportDto> {
  constructor(private readonly ledger: WalletLedgerRepository) {}

  async execute(): Promise<Result<LiabilityReportDto, DomainError>> {
    const lines = await this.ledger.findAllAvailable(SCAN_LIMIT);
    const soonThreshold = new Date(Date.now() + SOON_MS).toISOString();

    let totalAvailableCents = 0;
    let expiringSoonCents = 0;
    for (const line of lines) {
      totalAvailableCents += line.availableCents;
      if (
        line.availableCents > 0 &&
        line.expiresAt !== null &&
        line.expiresAt <= soonThreshold
      ) {
        expiringSoonCents += line.availableCents;
      }
    }

    return ok({
      totalAvailableCents,
      availableLineCount: lines.length,
      expiringSoonCents,
    });
  }
}
