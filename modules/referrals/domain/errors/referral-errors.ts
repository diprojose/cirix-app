import { DomainError } from "@/shared/domain/domain-error";

/** Raised when someone tries to refer themselves (BR-24). */
export class SelfReferralError extends DomainError {
  readonly code = "referrals/self-referral";

  constructor() {
    super("You cannot refer yourself.");
  }
}

/** Raised when the referred user already has a referral (referred at most once). */
export class AlreadyReferredError extends DomainError {
  readonly code = "referrals/already-referred";

  constructor() {
    super("This user was already referred.");
  }
}

/** Raised when a referral code is invalid or resolves to no referrer. */
export class ReferralCodeNotFoundError extends DomainError {
  readonly code = "referrals/code-not-found";

  constructor(code: string) {
    super(`Referral code "${code}" was not found.`);
  }
}

/** Raised when a referral is built with invalid attributes. */
export class InvalidReferralError extends DomainError {
  readonly code = "referrals/invalid-referral";
}

/** Raised when a persisted referral document fails domain validation on restore. */
export class CorruptReferralSnapshotError extends DomainError {
  readonly code = "referrals/corrupt-snapshot";
}
