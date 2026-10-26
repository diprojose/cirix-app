import type { Customer } from "../entities/customer";

/** Options for paging a business's customers, newest first. */
export type ListCustomersOptions = {
  limit: number;
  /** Return only customers created strictly before this ISO date. */
  before?: string;
};

/**
 * CustomerRepository is the persistence port for the CRM customer aggregate.
 * Every method takes the business id explicitly: there is no way to read a
 * customer without naming the tenant, so a query can never leak across
 * businesses by accident.
 */
export interface CustomerRepository {
  find(businessId: string, userId: string): Promise<Customer | null>;

  /**
   * Inserts the customer only if the person is not yet registered in that
   * business, atomically. Returns `true` when it was created and `false` when
   * the person already existed (nothing is written then).
   */
  createIfAbsent(customer: Customer): Promise<boolean>;

  /** Customers of one business, newest first. */
  list(businessId: string, options: ListCustomersOptions): Promise<Customer[]>;

  /** Ids of the businesses where this person is a customer. */
  listBusinessIdsByUser(userId: string): Promise<string[]>;
}
