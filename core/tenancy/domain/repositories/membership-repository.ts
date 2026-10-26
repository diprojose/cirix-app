import type { Membership } from "../entities/membership";

/** MembershipRepository is the persistence port for who works at which business. */
export interface MembershipRepository {
  find(businessId: string, userId: string): Promise<Membership | null>;

  /** Every business where the person holds a role. */
  listByUser(userId: string): Promise<Membership[]>;

  /** Everyone who holds a role in the business. */
  listByBusiness(businessId: string): Promise<Membership[]>;

  /** Inserts the membership or replaces the existing role for the same pair. */
  save(membership: Membership): Promise<void>;

  /** Removes the membership (idempotent). */
  remove(businessId: string, userId: string): Promise<void>;
}
