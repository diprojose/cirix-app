/**
 * ReferralCodeRepository maps between a referrer and the short code in their
 * shareable link. A referrer has exactly one stable code — `getOrCreateForReferrer`
 * mints it on first use and returns the same one thereafter — and
 * `resolveToReferrer` turns a code typed by a new signup back into the referrer's
 * uid. Keeping this separate from the {@link ReferralRepository} lets the code be
 * looked up without loading referrals.
 */
export interface ReferralCodeRepository {
  /** The referrer's stable code, creating one atomically if none exists yet. */
  getOrCreateForReferrer(referrerUid: string): Promise<string>;

  /** The referrer uid a code belongs to, or `null` when the code is unknown. */
  resolveToReferrer(code: string): Promise<string | null>;
}
