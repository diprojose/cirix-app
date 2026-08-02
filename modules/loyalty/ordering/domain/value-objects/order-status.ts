/**
 * The lifecycle of an order, mirrored 1:1 with what the customer sees:
 * `received` (placed, waiting for payment) → `payment_reported` (customer sent
 * a payment reference) → `confirmed` (operator verified payment and the baker
 * accepted) → `preparing` → `ready` (for delivery/pickup) → `delivered`.
 * `cancelled` is reachable from any non-final status.
 */
export type OrderStatus =
  | "received"
  | "payment_reported"
  | "confirmed"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

/** Allowed moves out of each status. `payment_reported` allows re-reporting. */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  received: ["payment_reported", "confirmed", "cancelled"],
  payment_reported: ["payment_reported", "confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

/** True when moving `from → to` is a legal lifecycle step. */
export const canTransition = (from: OrderStatus, to: OrderStatus): boolean =>
  TRANSITIONS[from].includes(to);

/** Type guard for strings loaded from persistence or transport. */
export const isOrderStatus = (value: string): value is OrderStatus =>
  value in TRANSITIONS;
