/**
 * Payment channels the business accepts. There is no card gateway: every method
 * is settled outside the app and manually verified by the operator against the
 * reference the customer reports (the standard flow for Venezuelan small
 * commerce). `pago_movil` and `transferencia` are paid in bolívares; `zelle`
 * and `efectivo` in US dollars.
 */
export const PAYMENT_METHODS = ["pago_movil", "transferencia", "zelle", "efectivo"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Type guard for strings coming from forms or persistence. */
export const isPaymentMethod = (value: string): value is PaymentMethod =>
  (PAYMENT_METHODS as readonly string[]).includes(value);
