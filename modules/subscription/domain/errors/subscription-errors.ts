import { DomainError } from "@/shared/domain/domain-error";

/** Raised when building a premium upgrade request with invalid attributes. */
export class InvalidPremiumRequestError extends DomainError {
  readonly code = "subscription/invalid-premium-request";
}
