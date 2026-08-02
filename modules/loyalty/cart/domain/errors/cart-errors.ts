import { DomainError } from "@/shared/domain/domain-error";

/** Raised when a line quantity is not an integer within the allowed range. */
export class InvalidQuantityError extends DomainError {
  readonly code = "cart/invalid-quantity";
}

/** Raised when building a cart line with invalid attributes (e.g. an empty name). */
export class InvalidCartLineError extends DomainError {
  readonly code = "cart/invalid-line";
}

/**
 * Raised when adding a product whose currency differs from the currency already
 * present in the cart. A cart holds a single currency so its subtotal is well
 * defined.
 */
export class MixedCurrencyError extends DomainError {
  readonly code = "cart/mixed-currency";

  constructor(expected: string, received: string) {
    super(
      `Cannot mix currencies in a cart: expected "${expected}" but received "${received}".`
    );
  }
}

/** Raised when a cart operation targets a product that is not in the cart. */
export class CartLineNotFoundError extends DomainError {
  readonly code = "cart/line-not-found";

  constructor(productId: string) {
    super(`No cart line for product "${productId}".`);
  }
}
