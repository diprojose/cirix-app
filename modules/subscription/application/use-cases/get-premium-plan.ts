import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { PremiumPlanDto } from "../dtos/premium-plan-dto";

/**
 * Returns the premium subscription plan (amount, currency, billing interval) as
 * a plain DTO for display. The concrete plan is supplied by the infrastructure
 * layer through constructor injection, so the price lives in one place and the
 * use case stays free of configuration details.
 */
export class GetPremiumPlan implements UseCase<void, PremiumPlanDto> {
  constructor(private readonly plan: PremiumPlanDto) {}

  async execute(): Promise<Result<PremiumPlanDto, DomainError>> {
    return ok(this.plan);
  }
}
