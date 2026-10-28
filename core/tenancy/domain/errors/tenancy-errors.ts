import { DomainError } from "@/shared/domain/domain-error";

/** Raised when a business is built with invalid attributes (name, slug, kind). */
export class InvalidBusinessError extends DomainError {
  readonly code = "tenancy/invalid-business";
}

/** Raised when a membership is built with invalid attributes. */
export class InvalidMembershipError extends DomainError {
  readonly code = "tenancy/invalid-membership";
}

/** Raised when the public URL name (slug) is already used by another business. */
export class BusinessSlugTakenError extends DomainError {
  readonly code = "tenancy/slug-taken";

  constructor(slug: string) {
    super(`The business address "${slug}" is already in use.`);
  }
}

/** Raised when no business matches the requested slug or id. */
export class BusinessNotFoundError extends DomainError {
  readonly code = "tenancy/not-found";

  constructor(identifier: string) {
    super(`Business "${identifier}" was not found.`);
  }
}

/** The viewer is not a member of the business, or lacks the needed permission. */
export class BusinessAccessDeniedError extends DomainError {
  readonly code = "tenancy/access-denied";

  constructor() {
    super("You do not have access to this business.");
  }
}

/** The business exists but an administrator suspended it. */
export class BusinessSuspendedError extends DomainError {
  readonly code = "tenancy/suspended";

  constructor() {
    super("This business is currently suspended.");
  }
}

/** The viewer's role may not grant, change or remove this role. */
export class TeamChangeDeniedError extends DomainError {
  readonly code = "tenancy/team-change-denied";

  constructor() {
    super("Your role cannot make this change to the team.");
  }
}

/** The change would leave the business without an owner. */
export class LastOwnerError extends DomainError {
  readonly code = "tenancy/last-owner";

  constructor() {
    super("A business must keep at least one owner.");
  }
}

/** The business reached the most people a team may have. */
export class TeamFullError extends DomainError {
  readonly code = "tenancy/team-full";

  constructor(limit: number) {
    super(`A team can have at most ${limit} people.`);
  }
}

/** The person to change holds no role in the business. */
export class MemberNotFoundError extends DomainError {
  readonly code = "tenancy/member-not-found";

  constructor() {
    super("This person is not part of the team.");
  }
}

/** The account behind the email was disabled by an administrator. */
export class AccountDisabledError extends DomainError {
  readonly code = "tenancy/account-disabled";

  constructor() {
    super("This account is disabled.");
  }
}

/** Raised when a persisted business document fails domain validation on restore. */
export class CorruptBusinessSnapshotError extends DomainError {
  readonly code = "tenancy/corrupt-snapshot";
}
