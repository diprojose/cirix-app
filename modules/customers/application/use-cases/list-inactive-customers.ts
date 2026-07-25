import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CustomerProfileRepository } from "../../domain/repositories/customer-profile-repository";

/** Input for {@link ListInactiveCustomers}: the inactivity threshold in days. */
export type ListInactiveCustomersInput = { minDaysInactive: number };

/** One inactive customer, for the escheatment report. */
export type InactiveCustomerDto = { uid: string; lastOrderAt: string | null };

const SCAN_LIMIT = 5000;

/**
 * Lists customers who have been inactive beyond a threshold — the candidates for
 * the unclaimed-balance (escheatment) report (US-I3, BR-23). It returns just the
 * uid and last-order date; the caller cross-references their wallet balance.
 */
export class ListInactiveCustomers
  implements UseCase<ListInactiveCustomersInput, InactiveCustomerDto[]>
{
  constructor(private readonly profiles: CustomerProfileRepository) {}

  async execute(
    input: ListInactiveCustomersInput
  ): Promise<Result<InactiveCustomerDto[], DomainError>> {
    const nowIso = new Date().toISOString();
    const all = await this.profiles.findAll(SCAN_LIMIT);
    const inactive = all
      .filter((profile) => profile.recencyDays(nowIso) > input.minDaysInactive)
      .map((profile) => ({ uid: profile.uid, lastOrderAt: profile.lastOrderAt }));
    return ok(inactive);
  }
}
