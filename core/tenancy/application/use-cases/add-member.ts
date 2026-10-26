import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { BusinessRepository } from "../../domain/repositories/business-repository";
import type { MembershipRepository } from "../../domain/repositories/membership-repository";
import { Membership } from "../../domain/entities/membership";
import { BusinessId } from "../../domain/value-objects/business-id";
import { BusinessNotFoundError } from "../../domain/errors/tenancy-errors";
import type { MemberRole } from "../../domain/value-objects/member-role";

export type AddMemberInput = {
  businessId: string;
  userId: string;
  email: string;
  role: string;
};

/**
 * Grants a person a role in a business. Granting again replaces the previous
 * role, which is also how a role is changed. The caller (an administrator
 * script, or an owner managing their own team) authorizes the action.
 */
export class AddMember implements UseCase<AddMemberInput, { role: MemberRole }> {
  constructor(
    private readonly businesses: BusinessRepository,
    private readonly memberships: MembershipRepository
  ) {}

  async execute(input: AddMemberInput): Promise<Result<{ role: MemberRole }, DomainError>> {
    const business = await this.businesses.findById(BusinessId.from(input.businessId));
    if (business === null) return err(new BusinessNotFoundError(input.businessId));

    const membership = Membership.create(input);
    if (!membership.ok) return membership;

    await this.memberships.save(membership.value);
    return ok({ role: membership.value.role });
  }
}
