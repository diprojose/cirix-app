import { DomainError } from "@/shared/domain/domain-error";

/** Raised when a redemption asks for more credit than the customer has available. */
export class InsufficientBalanceError extends DomainError {
  readonly code = "rewards/insufficient-balance";

  constructor(availableCents: number, requestedCents: number) {
    super(
      `Requested ${requestedCents} cents of credit but only ${availableCents} are available.`
    );
  }
}

/** Raised when a redemption exceeds the per-order discount cap (BR-05). */
export class RedeemOverCapError extends DomainError {
  readonly code = "rewards/redeem-over-cap";

  constructor(capCents: number) {
    super(`Credit applied to an order may not exceed ${capCents} cents.`);
  }
}

/** Raised when a manual adjustment is missing its mandatory reason (US-G3). */
export class InvalidAdjustmentError extends DomainError {
  readonly code = "rewards/invalid-adjustment";
}

/** Raised when a ledger line is built with invalid attributes. */
export class InvalidLedgerEntryError extends DomainError {
  readonly code = "rewards/invalid-ledger-entry";
}

/** Raised when a status change is not allowed by the line's lifecycle. */
export class InvalidLedgerTransitionError extends DomainError {
  readonly code = "rewards/invalid-ledger-transition";

  constructor(from: string, to: string) {
    super(`A ledger line cannot move from "${from}" to "${to}".`);
  }
}

/** Raised when the reward rules configuration is out of range. */
export class InvalidRewardRulesError extends DomainError {
  readonly code = "rewards/invalid-reward-rules";
}

/** Raised when a persisted ledger document fails domain validation on restore. */
export class CorruptLedgerSnapshotError extends DomainError {
  readonly code = "rewards/corrupt-ledger-snapshot";
}
