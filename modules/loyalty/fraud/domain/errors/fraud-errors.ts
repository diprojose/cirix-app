import { DomainError } from "@/shared/domain/domain-error";

/** Raised when a fraud alert is built with invalid attributes. */
export class InvalidFraudAlertError extends DomainError {
  readonly code = "fraud/invalid-alert";
}

/** Raised when a fraud alert is requested by an id that has no match. */
export class FraudAlertNotFoundError extends DomainError {
  readonly code = "fraud/alert-not-found";

  constructor(id: string) {
    super(`Fraud alert "${id}" was not found.`);
  }
}

/** Raised when resolving an alert that was already reviewed. */
export class AlertAlreadyResolvedError extends DomainError {
  readonly code = "fraud/already-resolved";

  constructor() {
    super("This fraud alert has already been resolved.");
  }
}

/** Raised when a persisted fraud alert fails domain validation on restore. */
export class CorruptFraudAlertSnapshotError extends DomainError {
  readonly code = "fraud/corrupt-snapshot";
}
