import type { Customer, CustomerSource } from "../../domain/entities/customer";
import type { CustomerEvent, CustomerEventData, CustomerEventType } from "../../domain/entities/customer-event";

/** Plain, serializable view of a customer for pages and API responses. */
export type CustomerDto = {
  userId: string;
  email: string;
  name: string;
  phone: string | null;
  source: CustomerSource;
  tags: string[];
  createdAt: string;
  lastSeenAt: string;
};

export type CustomerEventDto = {
  id: string;
  type: CustomerEventType;
  occurredAt: string;
  data: CustomerEventData;
};

export const toCustomerDto = (customer: Customer): CustomerDto => ({
  userId: customer.userId,
  email: customer.email,
  name: customer.name,
  phone: customer.phone,
  source: customer.source,
  tags: [...customer.tags],
  createdAt: customer.createdAt,
  lastSeenAt: customer.lastSeenAt,
});

export const toCustomerEventDto = (event: CustomerEvent): CustomerEventDto => ({
  id: event.id,
  type: event.type,
  occurredAt: event.occurredAt,
  data: { ...event.data },
});
