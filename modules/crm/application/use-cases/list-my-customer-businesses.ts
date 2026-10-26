import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CustomerRepository } from "../../domain/repositories/customer-repository";

/**
 * Ids of the businesses where a person is a customer: the data behind their
 * "my cards" screen. Names and branding come from the tenancy module, composed
 * by the caller, so this module never reads another module's data.
 */
export class ListMyCustomerBusinesses implements UseCase<string, string[]> {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(userId: string): Promise<Result<string[], DomainError>> {
    return ok(await this.customers.listBusinessIdsByUser(userId));
  }
}
