import { DomainError } from "@/shared/domain/domain-error";

/** Raised when a customer is built with invalid attributes (name, phone, email). */
export class InvalidCustomerError extends DomainError {
  readonly code = "crm/invalid-customer";
}

/** Raised when a customer event is built with invalid attributes. */
export class InvalidCustomerEventError extends DomainError {
  readonly code = "crm/invalid-event";
}

/** Raised when the business has no customer with the requested id. */
export class CustomerNotFoundError extends DomainError {
  readonly code = "crm/customer-not-found";

  constructor() {
    super("Customer was not found in this business.");
  }
}

/** Raised when a persisted customer document fails domain validation on restore. */
export class CorruptCustomerSnapshotError extends DomainError {
  readonly code = "crm/corrupt-snapshot";
}
