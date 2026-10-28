import { DomainError } from "@/shared/domain/domain-error";

/** Raised when a stamp program is configured with out-of-range values. */
export class InvalidStampProgramError extends DomainError {
  readonly code = "stamps/invalid-program";
}

/** The customer stamped too recently; the cooldown stops repeated or replayed stamps. */
export class StampTooSoonError extends DomainError {
  readonly code = "stamps/too-soon";

  constructor(readonly retryAfterSeconds: number) {
    super("This customer was stamped very recently.");
  }
}

/** A finished card must be redeemed before it can collect new stamps. */
export class RewardPendingError extends DomainError {
  readonly code = "stamps/reward-pending";

  constructor() {
    super("The reward is ready: redeem it before adding more stamps.");
  }
}

/** Redemption was requested but the card has no reward waiting. */
export class NoRewardToRedeemError extends DomainError {
  readonly code = "stamps/no-reward";

  constructor() {
    super("This card has no reward to redeem yet.");
  }
}

/** The business paused its stamp program. */
export class ProgramInactiveError extends DomainError {
  readonly code = "stamps/inactive";

  constructor() {
    super("The stamp program is paused.");
  }
}

/** The person has not joined this business, so there is no card to stamp. */
export class NotACustomerError extends DomainError {
  readonly code = "stamps/not-a-customer";

  constructor() {
    super("This person is not a customer of the business.");
  }
}

/**
 * The scan code is malformed, forged, or was issued for another business. These
 * cases look the same on purpose, so a probing attacker learns nothing.
 */
export class InvalidScanTokenError extends DomainError {
  readonly code = "stamps/invalid-token";

  constructor() {
    super("This code is not valid.");
  }
}

/** The scan code was genuine but is too old; the customer must show a fresh one. */
export class ExpiredScanTokenError extends DomainError {
  readonly code = "stamps/expired-token";

  constructor() {
    super("This code has expired. Ask the customer to refresh it.");
  }
}

/** The business has not turned on stamping with the table QR. */
export class TableStampsDisabledError extends DomainError {
  readonly code = "stamps/table-disabled";

  constructor() {
    super("This business does not give stamps from the table QR.");
  }
}

/** The table QR's code is missing, wrong, or was replaced by the owner. */
export class InvalidTableCodeError extends DomainError {
  readonly code = "stamps/invalid-table-code";

  constructor() {
    super("This table code is no longer valid.");
  }
}

/** Raised when a stored card holds impossible numbers and cannot be trusted. */
export class CorruptStampCardError extends DomainError {
  readonly code = "stamps/corrupt-card";
}

/** Raised when the signing secret is missing or too weak to be trusted. */
export class ScanSecretMisconfiguredError extends DomainError {
  readonly code = "stamps/misconfigured";

  constructor() {
    super("The stamp signing secret is not configured.");
  }
}
