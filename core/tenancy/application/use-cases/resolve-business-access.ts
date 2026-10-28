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
import { BusinessId } from "../../domain/value-objects/business-id";

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
    const slug = input.slug.trim().toLowerCase();
    const id = await this.businesses.idForSlug(slug);
    if (id === null) return err(new BusinessNotFoundError(input.slug));

    // Both reads in one round trip: this gate runs on every business page and API call.
    const [business, membership] = await Promise.all([
      this.businesses.findById(BusinessId.from(id)),
      input.platformAdmin ? Promise.resolve(null) : this.memberships.find(id, input.userId),
    ]);
    if (business === null || business.slug.value !== slug) return err(new BusinessNotFoundError(input.slug));

    const role: BusinessRole | null = input.platformAdmin ? "platform_admin" : membership?.role ?? null;
    if (role === null) return err(new BusinessAccessDeniedError());

    // Administrators can still inspect a suspended business; everyone else cannot.
    if (!business.isActive && role !== "platform_admin") return err(new BusinessSuspendedError());
    if (input.permission && !roleCan(role, input.permission)) return err(new BusinessAccessDeniedError());

    return ok({ business: toBusinessDto(business), role });
  }
}
