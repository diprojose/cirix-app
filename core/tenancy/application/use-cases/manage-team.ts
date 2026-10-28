import type { UseCase } from "@/shared/application/use-case";
import type { AuditTrail } from "@/shared/application/audit-trail";
import { err, ok, type Result } from "@/shared/domain/result";
import type { DomainError } from "@/shared/domain/domain-error";
import type { MembershipRepository } from "../../domain/repositories/membership-repository";
import type { AccountDirectory } from "../../domain/repositories/account-directory";
import { Membership } from "../../domain/entities/membership";
import { isMemberRole, roleCanManage, type BusinessRole, type MemberRole } from "../../domain/value-objects/member-role";
import {
  AccountDisabledError,
  InvalidMembershipError,
  LastOwnerError,
  MemberNotFoundError,
  TeamChangeDeniedError,
  TeamFullError,
} from "../../domain/errors/tenancy-errors";

/*
 * Team management from the business panel. The caller has already resolved the
 * business from the URL and the actor from the session; these use cases decide
 * what that actor may change, and record every change in the audit trail.
 */

/** Most people one business's team may have. */
export const MAX_TEAM_SIZE = 50;

export type TeamMemberDto = {
  userId: string;
  email: string;
  role: MemberRole;
  createdAt: string;
};

const ROLE_ORDER: Record<MemberRole, number> = { owner: 0, staff: 1 };

const toTeamMemberDto = (membership: Membership): TeamMemberDto => ({
  userId: membership.userId,
  email: membership.email,
  role: membership.role,
  createdAt: membership.createdAt,
});

/** Everyone with a role in the business: owners first, then by email. */
export class ListTeam implements UseCase<string, TeamMemberDto[]> {
  constructor(private readonly memberships: MembershipRepository) {}

  async execute(businessId: string): Promise<Result<TeamMemberDto[], DomainError>> {
    const team = await this.memberships.listByBusiness(businessId);
    return ok(
      team
        .map(toTeamMemberDto)
        .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.email.localeCompare(b.email))
    );
  }
}

/** Who is changing the team, as resolved by the access gate. */
type Actor = { actorUserId: string; actorRole: BusinessRole };

export type AddTeamMemberInput = Actor & { businessId: string; email: string; role: string };

/**
 * Gives a person a role, or changes the role they hold. The person is found by
 * email and needs no prior sign-in. Granting the role someone already holds
 * changes nothing and still succeeds, so a repeated click is harmless.
 */
export class AddTeamMember implements UseCase<AddTeamMemberInput, TeamMemberDto> {
  constructor(
    private readonly memberships: MembershipRepository,
    private readonly accounts: AccountDirectory,
    private readonly audit: AuditTrail
  ) {}

  async execute(input: AddTeamMemberInput): Promise<Result<TeamMemberDto, DomainError>> {
    if (!isMemberRole(input.role)) return err(new InvalidMembershipError(`Unknown role "${input.role}".`));
    if (!roleCanManage(input.actorRole, input.role)) return err(new TeamChangeDeniedError());
    // Validate the email before an account can be reserved for it.
    const draft = Membership.create({ businessId: input.businessId, userId: "pending", email: input.email, role: input.role });
    if (!draft.ok) return draft;

    const team = await this.memberships.listByBusiness(input.businessId);
    const account = await this.accounts.findOrCreate(draft.value.email);
    if (account.disabled) return err(new AccountDisabledError());

    const current = team.find((member) => member.userId === account.userId) ?? null;
    if (current?.role === input.role) return ok(toTeamMemberDto(current));
    if (current === null && team.length >= MAX_TEAM_SIZE) return err(new TeamFullError(MAX_TEAM_SIZE));
    if (current !== null) {
      if (!roleCanManage(input.actorRole, current.role)) return err(new TeamChangeDeniedError());
      if (current.role === "owner" && !hasAnotherOwner(team, current.userId)) return err(new LastOwnerError());
    }

    const membership = Membership.create({
      businessId: input.businessId,
      userId: account.userId,
      email: account.email || draft.value.email,
      role: input.role,
    });
    if (!membership.ok) return membership;
    await this.memberships.save(membership.value);
    await this.audit.record({
      actorId: input.actorUserId,
      action: "tenancy.member_granted",
      before: current === null ? null : { businessId: input.businessId, userId: current.userId, role: current.role },
      after: { businessId: input.businessId, userId: account.userId, email: membership.value.email, role: input.role },
    });
    return ok(toTeamMemberDto(membership.value));
  }
}

export type RemoveTeamMemberInput = Actor & { businessId: string; userId: string };

/** Takes a person's role away. Their next request already finds no access. */
export class RemoveTeamMember implements UseCase<RemoveTeamMemberInput, { userId: string }> {
  constructor(
    private readonly memberships: MembershipRepository,
    private readonly audit: AuditTrail
  ) {}

  async execute(input: RemoveTeamMemberInput): Promise<Result<{ userId: string }, DomainError>> {
    const current = await this.memberships.find(input.businessId, input.userId);
    if (current === null) return err(new MemberNotFoundError());
    if (!roleCanManage(input.actorRole, current.role)) return err(new TeamChangeDeniedError());
    if (current.role === "owner") {
      const team = await this.memberships.listByBusiness(input.businessId);
      if (!hasAnotherOwner(team, current.userId)) return err(new LastOwnerError());
    }

    await this.memberships.remove(input.businessId, input.userId);
    await this.audit.record({
      actorId: input.actorUserId,
      action: "tenancy.member_removed",
      before: { businessId: input.businessId, userId: current.userId, email: current.email, role: current.role },
      after: null,
    });
    return ok({ userId: current.userId });
  }
}

const hasAnotherOwner = (team: Membership[], userId: string): boolean =>
  team.some((member) => member.role === "owner" && member.userId !== userId);
