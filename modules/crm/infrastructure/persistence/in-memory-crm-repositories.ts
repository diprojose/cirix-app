import type { Customer } from "../../domain/entities/customer";
import type { CustomerEvent } from "../../domain/entities/customer-event";
import type { CustomerRepository, ListCustomersOptions } from "../../domain/repositories/customer-repository";
import type { CustomerEventRepository } from "../../domain/repositories/customer-event-repository";

/** Process-local adapter for tests and local experiments. */
export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly items = new Map<string, Customer>();

  private key = (businessId: string, userId: string) => `${businessId}_${userId}`;

  async find(businessId: string, userId: string): Promise<Customer | null> {
    return this.items.get(this.key(businessId, userId)) ?? null;
  }

  async createIfAbsent(customer: Customer): Promise<boolean> {
    const key = this.key(customer.businessId, customer.userId);
    if (this.items.has(key)) return false;
    this.items.set(key, customer);
    return true;
  }

  async list(businessId: string, options: ListCustomersOptions): Promise<Customer[]> {
    return [...this.items.values()]
      .filter((customer) => customer.businessId === businessId)
      .filter((customer) => !options.before || customer.createdAt < options.before)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
      .slice(0, options.limit);
  }

  async listBusinessIdsByUser(userId: string): Promise<string[]> {
    return [...this.items.values()].filter((customer) => customer.userId === userId).map((customer) => customer.businessId);
  }
}

/** Process-local adapter for tests and local experiments. */
export class InMemoryCustomerEventRepository implements CustomerEventRepository {
  private readonly items = new Map<string, CustomerEvent>();

  private key = (event: { businessId: string; userId: string; id: string }) =>
    `${event.businessId}_${event.userId}_${event.id}`;

  async append(event: CustomerEvent): Promise<void> {
    if (!this.items.has(this.key(event))) this.items.set(this.key(event), event);
  }

  async listByCustomer(businessId: string, userId: string, limit: number): Promise<CustomerEvent[]> {
    return [...this.items.values()]
      .filter((event) => event.businessId === businessId && event.userId === userId)
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0))
      .slice(0, limit);
  }
}
