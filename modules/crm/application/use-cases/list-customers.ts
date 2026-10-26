import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CustomerRepository } from "../../domain/repositories/customer-repository";
import { toCustomerDto, type CustomerDto } from "../dtos/customer-dto";

export type ListCustomersInput = {
  businessId: string;
  limit?: number;
  /** Cursor from the previous page (`nextCursor`). */
  before?: string;
};

export type ListCustomersOutput = {
  customers: CustomerDto[];
  /** Pass as `before` to read the next page; `null` when there are no more. */
  nextCursor: string | null;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Lists a business's customers, newest first, one page at a time. Callers must
 * have already authorized the viewer for `customers:read` in this business.
 */
export class ListCustomers implements UseCase<ListCustomersInput, ListCustomersOutput> {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(input: ListCustomersInput): Promise<Result<ListCustomersOutput, DomainError>> {
    const limit = Math.min(Math.max(Math.trunc(input.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);
    // Ask for one extra row to know whether another page exists.
    const rows = await this.customers.list(input.businessId, { limit: limit + 1, before: input.before });
    const page = rows.slice(0, limit);
    return ok({
      customers: page.map(toCustomerDto),
      nextCursor: rows.length > limit ? page[page.length - 1].createdAt : null,
    });
  }
}
