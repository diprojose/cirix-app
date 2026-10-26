import type { Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";

/** Who a scan code identifies: one person, within one business. */
export type ScanSubject = { businessId: string; userId: string };

export type IssuedScanToken = { token: string; expiresAt: string };

/**
 * ScanTokenSigner turns a customer's identity into a short-lived code that a
 * QR carries, and back. The code is signed, so it cannot be forged, and it
 * expires within a minute or two, so a screenshot is useless. The domain only
 * declares the contract; the cryptography lives in an adapter.
 */
export interface ScanTokenSigner {
  sign(subject: ScanSubject, now: Date): IssuedScanToken;

  /**
   * Checks signature and expiry. Fails with InvalidScanTokenError for anything
   * malformed or forged, and ExpiredScanTokenError for a genuine old code.
   */
  verify(token: string, now: Date): Result<ScanSubject, DomainError>;
}
