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

/** Raised when a persisted business document fails domain validation on restore. */
export class CorruptBusinessSnapshotError extends DomainError {
  readonly code = "tenancy/corrupt-snapshot";
}
