import { Identifier } from "@/shared/domain/identifier";

/**
 * LedgerEntryId is the typed identity of a {@link LedgerEntry}. For lines that
 * must be idempotent it is **deterministic** — derived from the source event
 * (e.g. `earn_<orderId>`) so a repeated event maps to the same id and cannot
 * create a second line (BR-11). Ad-hoc lines (manual adjustments) use a random
 * id instead.
 */
export class LedgerEntryId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  /** Wraps an existing or deterministically-derived id string. */
  static from(value: string): LedgerEntryId {
    return new LedgerEntryId(value);
  }

  /** Generates a brand-new random id (for lines with no natural key). */
  static generate(): LedgerEntryId {
    return new LedgerEntryId(crypto.randomUUID());
  }

  /** Deterministic id for the earn of an order — one earn per order (BR-11). */
  static forEarn(orderId: string): LedgerEntryId {
    return new LedgerEntryId(`earn_${orderId}`);
  }

  /** Deterministic id for the redemption spent on an order — one burn per order. */
  static forBurn(orderId: string): LedgerEntryId {
    return new LedgerEntryId(`burn_${orderId}`);
  }

  /** Deterministic id for a referrer's reward — one per referral (BR-08). */
  static forReferral(referralId: string): LedgerEntryId {
    return new LedgerEntryId(`referral_${referralId}`);
  }
}
