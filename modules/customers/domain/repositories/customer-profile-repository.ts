import type { CustomerProfile } from "../entities/customer-profile";

/**
 * CustomerProfileRepository is the persistence port for retention profiles. The
 * per-customer lookup drives the on-order update and coupon segment checks;
 * `findAll` backs the periodic jobs (segment recalculation and win-back), which
 * iterate the — deliberately small — profile store rather than scanning orders.
 */
export interface CustomerProfileRepository {
  /** The profile for a customer, or `null` if they have none yet. */
  findByUid(uid: string): Promise<CustomerProfile | null>;

  /** Every profile, bounded by the adapter (for the retention jobs). */
  findAll(limit: number): Promise<CustomerProfile[]>;

  /** Inserts the profile or replaces the existing one for the same uid. */
  save(profile: CustomerProfile): Promise<void>;
}
