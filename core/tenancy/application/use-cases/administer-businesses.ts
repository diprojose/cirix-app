import type { UseCase } from "@/shared/application/use-case";
import type { AuditTrail } from "@/shared/application/audit-trail";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { BusinessRepository } from "../../domain/repositories/business-repository";
import type { MembershipRepository } from "../../domain/repositories/membership-repository";
import type { AccountDirectory } from "../../domain/repositories/account-directory";
import { Business } from "../../domain/entities/business";
import { Membership } from "../../domain/entities/membership";
import { BusinessId } from "../../domain/value-objects/business-id";
import { isBusinessStatus, type BusinessStatus } from "../../domain/value-objects/business-kind";
import type { MemberRole } from "../../domain/value-objects/member-role";
import {
  AccountDisabledError,
  BusinessNotFoundError,
  BusinessSlugTakenError,
  InvalidBusinessError,
} from "../../domain/errors/tenancy-errors";
import { toBusinessDto, type BusinessDto } from "../dtos/business-dto";
import { CreateBusiness } from "./create-business";

/*
 * What Cirix administrators do across every business: see them all, open a new
 * one with its owner, and close or reopen one. The caller has already checked
 * that the person is a Cirix administrator; these use cases record every change
 * in the audit trail under that person's id.
 */

/** A business as the administrators' list shows it: who runs it, and since when. */
export type AdminBusinessDto = BusinessDto & {
  createdAt: string;
  team: { userId: string; email: string; role: MemberRole }[];
};

const ROLE_ORDER: Record<MemberRole, number> = { owner: 0, staff: 1 };

async function withTeam(business: Business, memberships: MembershipRepository): Promise<AdminBusinessDto> {
  const team = await memberships.listByBusiness(business.id.value);
  return {
    ...toBusinessDto(business),
    createdAt: business.createdAt,
    team: team
      .map(({ userId, email, role }) => ({ userId, email, role }))
      .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.email.localeCompare(b.email)),
  };
}

/** Every business, newest first, with its team. */
export class ListAllBusinesses implements UseCase<void, AdminBusinessDto[]> {
  constructor(
    private readonly businesses: BusinessRepository,
    private readonly memberships: MembershipRepository
  ) {}

  async execute(): Promise<Result<AdminBusinessDto[], DomainError>> {
    const all = await this.businesses.listAll();
    return ok(await Promise.all(all.map((business) => withTeam(business, this.memberships))));
  }
}

/** One business by its address, suspended or not, with its team. */
export class GetBusinessForAdmin implements UseCase<string, AdminBusinessDto> {
  constructor(
    private readonly businesses: BusinessRepository,
    private readonly memberships: MembershipRepository
  ) {}

  async execute(slug: string): Promise<Result<AdminBusinessDto, DomainError>> {
    const business = await this.businesses.findBySlug(slug.trim().toLowerCase());
    if (business === null) return err(new BusinessNotFoundError(slug));
    return ok(await withTeam(business, this.memberships));
  }
}

export type RegisterBusinessInput = {
  name: string;
  slug: string;
  kind: string;
  ownerEmail: string;
  actorUserId: string;
};

/**
 * Opens a new business and names its owner by email, in one step. The owner
 * needs no prior sign-in: an account with no password is reserved for the
 * address, and the person claims it by signing in with it (Google or a link).
 * Everything is validated before anything is written, so a typo leaves neither
 * a business without an owner nor a reserved account behind.
 */
export class RegisterBusiness implements UseCase<RegisterBusinessInput, BusinessDto> {
  constructor(
    private readonly businesses: BusinessRepository,
    private readonly memberships: MembershipRepository,
    private readonly accounts: AccountDirectory,
    private readonly audit: AuditTrail
  ) {}

  async execute(input: RegisterBusinessInput): Promise<Result<BusinessDto, DomainError>> {
    // Only restaurants and supermarkets have a loyalty program to run.
    if (input.kind !== "restaurant" && input.kind !== "supermarket") {
      return err(new InvalidBusinessError(`Unknown business kind "${input.kind}".`));
    }
    const draft = Business.create(input);
    if (!draft.ok) return draft;
    const owner = Membership.create({ businessId: draft.value.id.value, userId: "pending", email: input.ownerEmail, role: "owner" });
    if (!owner.ok) return owner;
    // A taken address is the likeliest mistake: say so before reserving an account.
    if ((await this.businesses.idForSlug(draft.value.slug.value)) !== null) {
      return err(new BusinessSlugTakenError(draft.value.slug.value));
    }

    const account = await this.accounts.findOrCreate(owner.value.email);
    if (account.disabled) return err(new AccountDisabledError());

    const created = await new CreateBusiness(this.businesses, this.memberships).execute({
      name: input.name,
      slug: input.slug,
      kind: input.kind,
      owner: { userId: account.userId, email: account.email || owner.value.email },
    });
    if (!created.ok) return created;

    await this.audit.record({
      actorId: input.actorUserId,
      action: "tenancy.business_created",
      before: null,
      after: { ...created.value, ownerUserId: account.userId, ownerEmail: account.email || owner.value.email },
    });
    return created;
  }
}

export type SetBusinessStatusInput = { slug: string; status: string; actorUserId: string };

/**
 * Closes a business or opens it again. A suspended business keeps all its data,
 * but its customers and team can no longer use it; Cirix administrators still can.
 * Asking for the status it already has changes nothing and still succeeds.
 */
export class SetBusinessStatus implements UseCase<SetBusinessStatusInput, BusinessDto> {
  constructor(
    private readonly businesses: BusinessRepository,
    private readonly audit: AuditTrail
  ) {}

  async execute(input: SetBusinessStatusInput): Promise<Result<BusinessDto, DomainError>> {
    if (!isBusinessStatus(input.status)) return err(new InvalidBusinessError(`Unknown status "${input.status}".`));
    const status: BusinessStatus = input.status;
    const business = await this.businesses.findBySlug(input.slug.trim().toLowerCase());
    if (business === null) return err(new BusinessNotFoundError(input.slug));
    if (business.status === status) return ok(toBusinessDto(business));

    await this.businesses.updateStatus(business.id, status);
    await this.audit.record({
      actorId: input.actorUserId,
      action: "tenancy.business_status_changed",
      before: { businessId: business.id.value, status: business.status },
      after: { businessId: business.id.value, status },
    });
    const updated = await this.businesses.findById(BusinessId.from(business.id.value));
    if (updated === null) return err(new BusinessNotFoundError(input.slug));
    return ok(toBusinessDto(updated));
  }
}
