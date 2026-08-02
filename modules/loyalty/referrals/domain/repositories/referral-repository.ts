import type { Referral } from "../entities/referral";

/**
 * ReferralRepository is the persistence port for referrals. Because a referral
 * is keyed by the referred user, `findByReferred` is the primary lookup —
 * "which referral did this buyer come through?" — driven on each of their
 * confirmed orders. `findByReferrer` backs the referrer's panel and the period
 * cap; `findBySecondPurchaseOrder` lets a cancellation undo the right reward.
 */
export interface ReferralRepository {
  /** The referral a user was invited through, or `null` if they weren't referred. */
  findByReferred(referredUid: string): Promise<Referral | null>;

  /** Every referral a given user has made (their invite funnel). */
  findByReferrer(referrerUid: string): Promise<Referral[]>;

  /** The referral whose second (reward-triggering) purchase is this order, if any. */
  findBySecondPurchaseOrder(orderId: string): Promise<Referral | null>;

  /** Every referral, bounded by the adapter (for the KPIs funnel). */
  findAll(limit: number): Promise<Referral[]>;

  /** Inserts the referral or replaces the existing one for the same referred user. */
  save(referral: Referral): Promise<void>;
}
