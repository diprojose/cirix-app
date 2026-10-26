import type { UseCase } from "@/shared/application/use-case";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { BusinessRepository } from "../../domain/repositories/business-repository";
import type { MembershipRepository } from "../../domain/repositories/membership-repository";
import { Business, type CreateBusinessInput } from "../../domain/entities/business";
import { Membership } from "../../domain/entities/membership";
import { BusinessSlugTakenError } from "../../domain/errors/tenancy-errors";
import { toBusinessDto, type BusinessDto } from "../dtos/business-dto";

/** Input for {@link CreateBusiness}: the business, and optionally its first owner. */
export type CreateBusinessUseCaseInput = CreateBusinessInput & {
  owner?: { userId: string; email: string };
};

/**
 * Registers a new business and, when an owner is given, makes that person its
 * owner. This is a Cirix administrator action (a script today); the caller is
 * responsible for authorizing it. The slug is reserved atomically by the
 * repository, so concurrent calls cannot create two businesses with one address.
 */
export class CreateBusiness implements UseCase<CreateBusinessUseCaseInput, BusinessDto> {
  constructor(
    private readonly businesses: BusinessRepository,
    private readonly memberships: MembershipRepository
  ) {}

  async execute(input: CreateBusinessUseCaseInput): Promise<Result<BusinessDto, DomainError>> {
    const business = Business.create(input);
    if (!business.ok) return business;

    // Validate the owner before writing anything, so a bad email leaves no orphan business.
    let ownership: Membership | null = null;
    if (input.owner) {
      const membership = Membership.create({
        businessId: business.value.id.value,
        userId: input.owner.userId,
        email: input.owner.email,
        role: "owner",
      });
      if (!membership.ok) return membership;
      ownership = membership.value;
    }

    try {
      await this.businesses.create(business.value);
    } catch (error) {
      if (error instanceof BusinessSlugTakenError) return err(error);
      throw error;
    }
    if (ownership) await this.memberships.save(ownership);
    return ok(toBusinessDto(business.value));
  }
}
