import type { Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { StampCard, StampRecord, RedemptionRecord } from "../entities/stamp-card";

/** What a decision wants written: the new card, plus the immutable record it produced. */
export type CardWrite = {
  card: StampCard;
  stamp?: StampRecord;
  redemption?: RedemptionRecord;
};

/**
 * StampCardRepository is the persistence port for cards. `transact` is the only
 * way to change one: the adapter loads the current card, hands it to `decide`
 * (pure domain logic), and persists the result in the same atomic step. Two
 * employees scanning at the same instant therefore cannot both succeed, and the
 * cooldown rule holds under concurrency, not just in a single request.
 */
export interface StampCardRepository {
  find(businessId: string, userId: string): Promise<StampCard | null>;

  /** The cards of several customers in one read, keyed by user id; people without a card are left out. */
  findMany(businessId: string, userIds: readonly string[]): Promise<Map<string, StampCard>>;

  /**
   * Atomically reads the card (`null` when the person has none yet), applies
   * `decide`, and stores its outcome. When `decide` fails nothing is written.
   */
  transact<T extends CardWrite>(
    businessId: string,
    userId: string,
    decide: (current: StampCard | null) => Result<T, DomainError>
  ): Promise<Result<T, DomainError>>;
}
