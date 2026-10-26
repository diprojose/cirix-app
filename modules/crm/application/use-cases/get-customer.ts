import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CustomerRepository } from "../../domain/repositories/customer-repository";
import { CustomerNotFoundError } from "../../domain/errors/customer-errors";
import { toCustomerDto, type CustomerDto } from "../dtos/customer-dto";

export type GetCustomerInput = { businessId: string; userId: string };

/** One person's CRM record inside one business, or a not-found error. */
export class GetCustomer implements UseCase<GetCustomerInput, CustomerDto> {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(input: GetCustomerInput): Promise<Result<CustomerDto, DomainError>> {
    const customer = await this.customers.find(input.businessId, input.userId);
    return customer === null ? err(new CustomerNotFoundError()) : ok(toCustomerDto(customer));
  }
}
