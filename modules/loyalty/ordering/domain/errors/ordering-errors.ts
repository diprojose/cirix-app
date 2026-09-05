import { DomainError } from "@/shared/domain/domain-error";

/** Raised when customer data (name or Venezuelan phone) is invalid. */
export class InvalidCustomerError extends DomainError {
  readonly code = "ordering/invalid-customer";
}

/** Raised when an order is not tied to a valid white-label brand slug. */
export class InvalidOrderBrandError extends DomainError {
  readonly code = "ordering/invalid-brand";

  constructor(brandSlug: string) {
    super(`Invalid order brand slug "${brandSlug}".`);
  }
}

/** Raised when an order line's snapshot data is invalid. */
export class InvalidOrderLineError extends DomainError {
  readonly code = "ordering/invalid-order-line";
}

/** Raised when trying to place an order without any lines. */
export class EmptyOrderError extends DomainError {
  readonly code = "ordering/empty-order";

  constructor() {
    super("An order requires at least one line.");
  }
}

/** Raised when order lines do not share a single currency. */
export class MixedCurrencyError extends DomainError {
  readonly code = "ordering/mixed-currency";

  constructor(expected: string, received: string) {
    super(`Order lines must share one currency: expected ${expected}, got ${received}.`);
  }
}

/** Raised when the scheduled delivery/pickup date is malformed or in the past. */
export class InvalidScheduledDateError extends DomainError {
  readonly code = "ordering/invalid-scheduled-date";
}

/** Raised when delivery method data is invalid. */
export class InvalidDeliveryError extends DomainError {
  readonly code = "ordering/invalid-delivery";
}

/** Raised when the requested delivery zone does not exist. */
export class DeliveryZoneNotFoundError extends DomainError {
  readonly code = "ordering/delivery-zone-not-found";

  constructor(zoneId: string) {
    super(`Delivery zone "${zoneId}" was not found.`);
  }
}

/** Raised when a referenced product cannot be ordered (missing or unavailable). */
export class ProductNotOrderableError extends DomainError {
  readonly code = "ordering/product-not-orderable";

  constructor(productId: string) {
    super(`Product "${productId}" is not available to order.`);
  }
}

/** Raised when an order cannot be found by id. */
export class OrderNotFoundError extends DomainError {
  readonly code = "ordering/order-not-found";

  constructor(orderId: string) {
    super(`Order "${orderId}" was not found.`);
  }
}

/** Raised when a payment report's data is invalid. */
export class InvalidPaymentReportError extends DomainError {
  readonly code = "ordering/invalid-payment-report";
}

/** Raised when a payment report cannot be found inside an order. */
export class PaymentReportNotFoundError extends DomainError {
  readonly code = "ordering/payment-report-not-found";

  constructor(paymentId: string) {
    super(`Payment report "${paymentId}" was not found on this order.`);
  }
}

/** Raised when reviewing a payment report that was already verified or rejected. */
export class PaymentAlreadyReviewedError extends DomainError {
  readonly code = "ordering/payment-already-reviewed";

  constructor(status: string) {
    super(`This payment report was already reviewed (status "${status}").`);
  }
}

/** Raised when an order status change is not allowed from the current status. */
export class InvalidOrderTransitionError extends DomainError {
  readonly code = "ordering/invalid-order-transition";

  constructor(from: string, to: string) {
    super(`An order cannot move from status "${from}" to "${to}".`);
  }
}

/** Raised when a persisted order snapshot cannot be rebuilt. */
export class CorruptOrderSnapshotError extends DomainError {
  readonly code = "ordering/corrupt-order-snapshot";
}

/** Raised when a credit discount is negative or exceeds the order subtotal. */
export class InvalidDiscountError extends DomainError {
  readonly code = "ordering/invalid-discount";
}
