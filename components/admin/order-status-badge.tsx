import type { OrderStatus } from "@/modules/ordering/domain/value-objects/order-status";
import { ORDER_STATUS_LABELS } from "@/components/orders/order-status";

/** Badge tint per status family: attention, in-flight, done, cancelled. */
function badgeClass(status: OrderStatus): string {
  if (status === "payment_reported") return "bg-cta/15 text-cta-strong";
  if (status === "cancelled") return "bg-danger/10 text-danger";
  if (status === "delivered") return "bg-sugar-200 text-text-muted";
  return "bg-accent-soft text-brand-800";
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
