import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CustomerRepository } from "../../domain/repositories/customer-repository";
import type { CustomerEventRepository } from "../../domain/repositories/customer-event-repository";
import { CustomerNotFoundError } from "../../domain/errors/customer-errors";
import {
  toCustomerDto,
  toCustomerEventDto,
  type CustomerDto,
  type CustomerEventDto,
} from "../dtos/customer-dto";

export type GetCustomerTimelineInput = {
  businessId: string;
  userId: string;
  limit?: number;
};

export type CustomerTimeline = {
  customer: CustomerDto;
  events: CustomerEventDto[];
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/** A customer with their history, newest event first. */
export class GetCustomerTimeline implements UseCase<GetCustomerTimelineInput, CustomerTimeline> {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly events: CustomerEventRepository
  ) {}

  async execute(input: GetCustomerTimelineInput): Promise<Result<CustomerTimeline, DomainError>> {
    const customer = await this.customers.find(input.businessId, input.userId);
    if (customer === null) return err(new CustomerNotFoundError());
    const limit = Math.min(Math.max(Math.trunc(input.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);
    const events = await this.events.listByCustomer(input.businessId, input.userId, limit);
    return ok({ customer: toCustomerDto(customer), events: events.map(toCustomerEventDto) });
  }
}
