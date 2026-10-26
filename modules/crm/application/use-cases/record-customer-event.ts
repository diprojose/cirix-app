import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CustomerRepository } from "../../domain/repositories/customer-repository";
import type { CustomerEventRepository } from "../../domain/repositories/customer-event-repository";
import { CustomerEvent, type CreateCustomerEventInput } from "../../domain/entities/customer-event";
import { CustomerNotFoundError } from "../../domain/errors/customer-errors";
import { toCustomerEventDto, type CustomerEventDto } from "../dtos/customer-dto";

/**
 * Appends an event to an existing customer's timeline. This is the single entry
 * point later phases use to log stamps, points or surveys, so the CRM stays the
 * one history of a person. Pass a stable `id` for events that must not repeat.
 */
export class RecordCustomerEvent implements UseCase<CreateCustomerEventInput, CustomerEventDto> {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly events: CustomerEventRepository
  ) {}

  async execute(input: CreateCustomerEventInput): Promise<Result<CustomerEventDto, DomainError>> {
    const event = CustomerEvent.create(input);
    if (!event.ok) return event;

    const customer = await this.customers.find(event.value.businessId, event.value.userId);
    if (customer === null) return err(new CustomerNotFoundError());

    await this.events.append(event.value);
    return ok(toCustomerEventDto(event.value));
  }
}
