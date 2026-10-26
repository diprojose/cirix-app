import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { BusinessRepository } from "../../domain/repositories/business-repository";
import type { MembershipRepository } from "../../domain/repositories/membership-repository";
import {
  BusinessAccessDeniedError,
  BusinessNotFoundError,
  BusinessSuspendedError,
} from "../../domain/errors/tenancy-errors";
import {
  roleCan,
  type BusinessPermission,
  type BusinessRole,
} from "../../domain/value-objects/member-role";
import { toBusinessDto, type BusinessAccessDto } from "../dtos/business-dto";

export type ResolveBusinessAccessInput = {
  slug: string;
  userId: string;
  /** True for a Cirix administrator, who may reach any business for support. */
  platformAdmin: boolean;
  /** When set, the resolved role must also grant this permission. */
  permission?: BusinessPermission;
};

/**
 * The single authorization gate for business data. Every page and API route
 * that shows a business's private information calls it, with the user id taken
 * from the verified session and the business resolved from the slug on the
 * server. A client can never name another business's id to reach its data.
 */
export class ResolveBusinessAccess
  implements UseCase<ResolveBusinessAccessInput, BusinessAccessDto>
{
  constructor(
    private readonly businesses: BusinessRepository,
    private readonly memberships: MembershipRepository
  ) {}

  async execute(input: ResolveBusinessAccessInput): Promise<Result<BusinessAccessDto, DomainError>> {
    const business = await this.businesses.findBySlug(input.slug.trim().toLowerCase());
    if (business === null) return err(new BusinessNotFoundError(input.slug));

    let role: BusinessRole | null = null;
    if (input.platformAdmin) {
      role = "platform_admin";
    } else {
      const membership = await this.memberships.find(business.id.value, input.userId);
      role = membership?.role ?? null;
    }
    if (role === null) return err(new BusinessAccessDeniedError());

    // Administrators can still inspect a suspended business; everyone else cannot.
    if (!business.isActive && role !== "platform_admin") return err(new BusinessSuspendedError());
    if (input.permission && !roleCan(role, input.permission)) return err(new BusinessAccessDeniedError());

    return ok({ business: toBusinessDto(business), role });
  }
}
