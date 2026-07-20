import { DomainError } from "@/shared/domain/domain-error";

/** Raised when building a premium upgrade request with invalid attributes. */
export class InvalidPremiumRequestError extends DomainError {
  readonly code = "subscription/invalid-premium-request";
}

/** Raised when a premium request cannot be found by id. */
export class PremiumRequestNotFoundError extends DomainError {
  readonly code = "subscription/premium-request-not-found";

  constructor(id: string) {
    super(`Premium request "${id}" was not found.`);
  }
}
