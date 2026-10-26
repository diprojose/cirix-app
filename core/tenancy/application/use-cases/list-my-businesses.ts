import type { UseCase } from "@/shared/application/use-case";
import { ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { BusinessRepository } from "../../domain/repositories/business-repository";
import type { MembershipRepository } from "../../domain/repositories/membership-repository";
import { toBusinessDto, type BusinessAccessDto } from "../dtos/business-dto";

/** Lists the active businesses where a person holds a role, with that role. */
export class ListMyBusinesses implements UseCase<string, BusinessAccessDto[]> {
  constructor(
    private readonly businesses: BusinessRepository,
    private readonly memberships: MembershipRepository
  ) {}

  async execute(userId: string): Promise<Result<BusinessAccessDto[], DomainError>> {
    const held = await this.memberships.listByUser(userId);
    if (held.length === 0) return ok([]);

    const found = await this.businesses.findByIds(held.map((membership) => membership.businessId));
    const byId = new Map(found.map((business) => [business.id.value, business]));
    const result: BusinessAccessDto[] = [];
    for (const membership of held) {
      const business = byId.get(membership.businessId);
      if (business?.isActive) {
        result.push({ business: toBusinessDto(business), role: membership.role });
      }
    }
    return ok(result);
  }
}
