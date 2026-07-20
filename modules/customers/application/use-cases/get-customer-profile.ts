import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { CustomerProfileRepository } from "../../domain/repositories/customer-profile-repository";
import type { RetentionConfig } from "../retention-config";
import type { CustomerProfileDto } from "../dtos/customer-profile-dto";

/** Input for {@link GetCustomerProfile}: whose retention standing to read. */
export type GetCustomerProfileInput = { customerUid: string };

/**
 * Returns a customer's retention standing for the storefront: their segment and
 * their progress toward the next streak bonus (US-B7). Includes the streak
 * target so the UI can draw a progress bar without knowing the program config.
 */
export class GetCustomerProfile implements UseCase<GetCustomerProfileInput, CustomerProfileDto> {
  constructor(
    private readonly profiles: CustomerProfileRepository,
    private readonly config: RetentionConfig
  ) {}

  async execute(input: GetCustomerProfileInput): Promise<Result<CustomerProfileDto, DomainError>> {
    const profile = await this.profiles.findByUid(input.customerUid);
    return ok({
      segment: profile?.segment ?? "nuevo",
      orderCount: profile?.orderCount ?? 0,
      streakWeeks: profile?.streakWeeks ?? 0,
      streakTargetWeeks: this.config.streak.targetWeeks,
    });
  }
}
