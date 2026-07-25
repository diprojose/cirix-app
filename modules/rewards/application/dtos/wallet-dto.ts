import type { LedgerEntry } from "../../domain/entities/ledger-entry";
import type { RewardReason } from "../../domain/value-objects/reward-reason";
import type { LedgerStatus } from "../../domain/value-objects/ledger-status";

/** One ledger line as plain, serializable data for the wallet UI. */
export type WalletEntryDto = {
  id: string;
  amountCents: number;
  reason: RewardReason;
  status: LedgerStatus;
  note: string;
  holdbackUntil: string | null;
  expiresAt: string | null;
  createdAt: string;
};

/**
 * WalletDto is the plain, serializable view of a customer's wallet: the folded
 * balances (available and pending) plus the full line history and the next
 * upcoming expiry. Being a plain object it crosses the RSC boundary safely and
 * the UI never re-derives the balance rules that live in the domain (US-A1).
 */
export type WalletDto = {
  availableCents: number;
  pendingCents: number;
  nextExpiration: string | null;
  entries: WalletEntryDto[];
};

/** Maps a customer's ledger lines to the folded wallet view. */
export const toWalletDto = (entries: readonly LedgerEntry[]): WalletDto => {
  let availableCents = 0;
  let pendingCents = 0;
  let nextExpiration: string | null = null;

  for (const entry of entries) {
    availableCents += entry.availableCents;
    pendingCents += entry.pendingCents;
    // Soonest expiry among still-spendable earn lines.
    if (entry.availableCents > 0 && entry.expiresAt !== null) {
      if (nextExpiration === null || entry.expiresAt < nextExpiration) {
        nextExpiration = entry.expiresAt;
      }
    }
  }

  const history = [...entries]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(toWalletEntryDto);

  return { availableCents, pendingCents, nextExpiration, entries: history };
};

/** Maps a single ledger line to its serializable DTO. */
const toWalletEntryDto = (entry: LedgerEntry): WalletEntryDto => ({
  id: entry.id.value,
  amountCents: entry.amountCents,
  reason: entry.reason,
  status: entry.status,
  note: entry.note,
  holdbackUntil: entry.holdbackUntil,
  expiresAt: entry.expiresAt,
  createdAt: entry.createdAt,
});
