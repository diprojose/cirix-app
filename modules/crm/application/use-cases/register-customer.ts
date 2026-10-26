import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CustomerRepository } from "../../domain/repositories/customer-repository";
import type { CustomerEventRepository } from "../../domain/repositories/customer-event-repository";
import { Customer, type CreateCustomerInput } from "../../domain/entities/customer";
import { CustomerEvent } from "../../domain/entities/customer-event";
import { CustomerNotFoundError } from "../../domain/errors/customer-errors";
import { toCustomerDto, type CustomerDto } from "../dtos/customer-dto";

export type RegisterCustomerOutput = {
  customer: CustomerDto;
  /** False when the person was already a customer of this business. */
  created: boolean;
};

/** Stable id so the registration event can never be recorded twice. */
const REGISTERED_EVENT_ID = "registered";

/**
 * Registers a person as a customer of a business. It is idempotent: scanning
 * the QR code twice, or retrying after a network error, returns the existing
 * customer and records nothing new. The business id and the user identity must
 * come from the server (the slug and the verified session), never from the
 * request body.
 */
export class RegisterCustomer implements UseCase<CreateCustomerInput, RegisterCustomerOutput> {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly events: CustomerEventRepository
  ) {}

  async execute(input: CreateCustomerInput): Promise<Result<RegisterCustomerOutput, DomainError>> {
    const customer = Customer.create(input);
    if (!customer.ok) return customer;

    const created = await this.customers.createIfAbsent(customer.value);
    if (!created) {
      const existing = await this.customers.find(customer.value.businessId, customer.value.userId);
      // The record vanished between the check and the read: report it, do not guess.
      if (existing === null) return err(new CustomerNotFoundError());
      return ok({ customer: toCustomerDto(existing), created: false });
    }

    const event = CustomerEvent.create({
      id: REGISTERED_EVENT_ID,
      businessId: customer.value.businessId,
      userId: customer.value.userId,
      type: "registered",
      data: { source: customer.value.source },
    });
    if (event.ok) await this.events.append(event.value);

    return ok({ customer: toCustomerDto(customer.value), created: true });
  }
}
