import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CustomerProfileRepository } from "../../domain/repositories/customer-profile-repository";
import type { CustomerSegmentDto } from "../dtos/customer-profile-dto";

/** Input for {@link GetCustomerSegment}: whose segment to read. */
export type GetCustomerSegmentInput = { customerUid: string };

/**
 * Returns a customer's current RFM segment, defaulting to `nuevo` when they have
 * no profile yet. Used to target coupons and offers by segment (BR-14) — the
 * segment travels into coupon evaluation and the storefront's offer list.
 */
export class GetCustomerSegment implements UseCase<GetCustomerSegmentInput, CustomerSegmentDto> {
  constructor(private readonly profiles: CustomerProfileRepository) {}

  async execute(input: GetCustomerSegmentInput): Promise<Result<CustomerSegmentDto, DomainError>> {
    const profile = await this.profiles.findByUid(input.customerUid);
    return ok({ segment: profile?.segment ?? "nuevo" });
  }
}
