import type { Business } from "../entities/business";
import type { BusinessId } from "../value-objects/business-id";

/**
 * BusinessRepository is the persistence port for the business aggregate. The
 * public address (slug) is unique: `create` must reserve it atomically so two
 * concurrent signups can never end up sharing one.
 */
export interface BusinessRepository {
  findById(id: BusinessId): Promise<Business | null>;

  /**
   * The id behind a normalized slug, or null. A slug never moves to another
   * business, so adapters may remember the answer; the business itself must
   * still be read fresh (its status can change).
   */
  idForSlug(slug: string): Promise<string | null>;

  /** Looks a business up by its normalized slug. */
  findBySlug(slug: string): Promise<Business | null>;

  /** Returns the businesses matching the given ids; unknown ids are skipped. */
  findByIds(ids: readonly string[]): Promise<Business[]>;

  /**
   * Inserts a new business and reserves its slug in one atomic step.
   * @throws BusinessSlugTakenError when the slug already belongs to another business.
   */
  create(business: Business): Promise<void>;
}
