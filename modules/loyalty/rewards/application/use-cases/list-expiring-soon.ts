import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { WalletLedgerRepository } from "../../domain/repositories/wallet-ledger-repository";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SCAN_LIMIT = 2000;

/** One available credit line about to expire, for notification. */
export type ExpiringLine = {
  customerUid: string;
  amountCents: number;
  expiresAt: string;
  entryId: string;
};

/** Input for {@link ListExpiringSoon}: how many days ahead to look. */
export type ListExpiringSoonInput = { withinDays: number };

/**
 * Lists available credit lines that will expire within the given window (US-H2),
 * so the notification job can warn each customer before their credit lapses.
 * Burn/adjustment lines carry no expiry, so only earn/referral/promotion credit
 * surfaces here.
 */
export class ListExpiringSoon implements UseCase<ListExpiringSoonInput, ExpiringLine[]> {
  constructor(private readonly ledger: WalletLedgerRepository) {}

  async execute(input: ListExpiringSoonInput): Promise<Result<ExpiringLine[], DomainError>> {
    const nowIso = new Date().toISOString();
    const thresholdIso = new Date(Date.now() + input.withinDays * MS_PER_DAY).toISOString();
    const available = await this.ledger.findAllAvailable(SCAN_LIMIT);

    const expiring = available
      .filter(
        (entry) =>
          entry.availableCents > 0 &&
          entry.expiresAt !== null &&
          entry.expiresAt > nowIso &&
          entry.expiresAt <= thresholdIso
      )
      .map((entry) => ({
        customerUid: entry.customerUid,
        amountCents: entry.amountCents,
        expiresAt: entry.expiresAt as string,
        entryId: entry.id.value,
      }));

    return ok(expiring);
  }
}
