import { DomainError } from "@/shared/domain/domain-error";

/** Raised when an exchange rate value is not a positive, finite number. */
export class InvalidExchangeRateError extends DomainError {
  readonly code = "pricing/invalid-exchange-rate";
}

/** Raised when no provider (remote nor fallback) could supply a rate. */
export class ExchangeRateUnavailableError extends DomainError {
  readonly code = "pricing/exchange-rate-unavailable";

  constructor() {
    super("No exchange rate is available from any configured source.");
  }
}
