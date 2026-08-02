import { DomainError } from "@/shared/domain/domain-error";

/** Raised when a product is requested by an id that has no match. */
export class ProductNotFoundError extends DomainError {
  readonly code = "catalog/product-not-found";

  constructor(id: string) {
    super(`Product with id "${id}" was not found.`);
  }
}

/** Raised when building a price with an invalid (negative, fractional or non-finite) amount. */
export class InvalidPriceError extends DomainError {
  readonly code = "catalog/invalid-price";
}

/** Raised when a product is built with invalid attributes (e.g. an empty name). */
export class InvalidProductError extends DomainError {
  readonly code = "catalog/invalid-product";
}

/** Raised when a product is assigned a department outside the known set. */
export class InvalidDepartmentError extends DomainError {
  readonly code = "catalog/invalid-department";
}
