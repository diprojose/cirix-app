import { DomainError } from "@/shared/domain/domain-error";

/** Raised when a dessert is requested by an id that has no match. */
export class DessertNotFoundError extends DomainError {
  readonly code = "catalog/dessert-not-found";

  constructor(id: string) {
    super(`Dessert with id "${id}" was not found.`);
  }
}

/** Raised when building a price with an invalid (negative, fractional or non-finite) amount. */
export class InvalidPriceError extends DomainError {
  readonly code = "catalog/invalid-price";
}

/** Raised when a dessert is built with invalid attributes (e.g. an empty name). */
export class InvalidDessertError extends DomainError {
  readonly code = "catalog/invalid-dessert";
}
