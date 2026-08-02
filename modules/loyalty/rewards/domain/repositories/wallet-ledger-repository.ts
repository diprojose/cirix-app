import type { LedgerEntry } from "../entities/ledger-entry";
import type { LedgerEntryId } from "../value-objects/ledger-entry-id";

/**
 * WalletLedgerRepository is the persistence port for the append-only rewards
 * ledger. The domain declares this contract; an infrastructure adapter
 * implements it. Because the ledger never edits history, the write surface is
 * intentionally narrow: `appendIfAbsent` for idempotent new lines (BR-11) and
 * `save` for the status transitions a line makes over its own lifecycle.
 */
export interface WalletLedgerRepository {
  /** Returns the line with the given id, or `null` when none exists. */
  findById(id: LedgerEntryId): Promise<LedgerEntry | null>;

  /**
   * Appends a new line only if its id is not already present, returning `true`
   * when it was written and `false` when a line with that id already existed.
   * This is what makes earn/burn idempotent against duplicate source events.
   */
  appendIfAbsent(entry: LedgerEntry): Promise<boolean>;

  /** Persists a status change on an existing line (release, expire, reverse). */
  save(entry: LedgerEntry): Promise<void>;

  /** Every line belonging to one customer (their full wallet history). */
  findByCustomer(customerUid: string): Promise<LedgerEntry[]>;

  /** Held earn lines whose holdback has passed at `nowIso` (release job). */
  findReleasable(nowIso: string, limit: number): Promise<LedgerEntry[]>;

  /** Available earn lines past their expiry at `nowIso` (expiry job). */
  findExpirable(nowIso: string, limit: number): Promise<LedgerEntry[]>;

  /** Every line currently `available`, across all customers (liability report). */
  findAllAvailable(limit: number): Promise<LedgerEntry[]>;
}
