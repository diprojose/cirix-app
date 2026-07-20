import type { PremiumRequest } from "../entities/premium-request";

/**
 * PremiumRequestRepository is the persistence port for premium upgrade
 * requests. The domain declares this contract; an infrastructure adapter
 * implements it. The application layer depends on this interface, never on a
 * concrete store, so persistence stays swappable (in-memory today, a database
 * tomorrow) without touching domain or application code.
 */
export interface PremiumRequestRepository {
  /** Inserts the request or replaces the existing one with the same id. */
  save(request: PremiumRequest): Promise<void>;

  /** Returns the request with the given id, or `null` if none exists. */
  findById(id: string): Promise<PremiumRequest | null>;

  /** Returns the pending request for the given user, or `null` if none exists. */
  findPendingByUid(uid: string): Promise<PremiumRequest | null>;

  /** Returns every request still awaiting an operator (queue view). */
  findAllPending(): Promise<PremiumRequest[]>;
}
