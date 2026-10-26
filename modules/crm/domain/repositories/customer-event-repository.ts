import type { CustomerEvent } from "../entities/customer-event";

/** CustomerEventRepository is the persistence port for a customer's timeline. */
export interface CustomerEventRepository {
  /** Appends the event; appending the same id again changes nothing. */
  append(event: CustomerEvent): Promise<void>;

  /** A customer's events, newest first. */
  listByCustomer(businessId: string, userId: string, limit: number): Promise<CustomerEvent[]>;
}
