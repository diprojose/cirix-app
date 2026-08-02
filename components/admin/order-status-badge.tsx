import type { OrderStatus } from "@/modules/loyalty/ordering/domain/value-objects/order-status";
import { ORDER_STATUS_LABELS } from "@/components/orders/order-status";

/** Badge tint per status family: attention, in-flight, done, cancelled. */
function badgeClass(status: OrderStatus): string {
  if (status === "payment_reported") return "bg-action-fill/15 text-action-strong";
  if (status === "cancelled") return "bg-danger/10 text-danger";
  if (status === "delivered") return "bg-stone-200 text-text-muted";
  return "bg-accent-soft text-accent-strong";
}

/** Compact status pill used across the admin panel. */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold ${badgeClass(status)}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
