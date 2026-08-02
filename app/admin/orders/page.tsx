import type { Metadata } from "next";
import Link from "next/link";
import { requireOperator } from "@/lib/auth/dal";
import { formatPrice } from "@/lib/format/money";
import { makeListOrders } from "@/modules/loyalty/ordering/infrastructure/di/ordering-container";
import { ORDER_STATUS_LABELS } from "@/components/orders/order-status";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import type { OrderStatus } from "@/modules/loyalty/ordering/domain/value-objects/order-status";

export const metadata: Metadata = { title: "Pedidos" };

/** Statuses that demand operator attention, shown first in the queue. */
const ATTENTION: OrderStatus[] = ["payment_reported", "received", "confirmed", "preparing", "ready"];

/**
 * Operator order queue: every order, the ones needing action first (reported
 * payments to verify, then fresh and in-flight orders), finished ones last.
 */
export default async function AdminOrdersPage() {
  await requireOperator();

  const result = await makeListOrders().execute();
  const orders = result.ok ? result.value : [];

  const rank = (status: OrderStatus) => {
    const index = ATTENTION.indexOf(status);
    return index === -1 ? ATTENTION.length : index;
  };
  const sorted = [...orders].sort((a, b) => rank(a.status) - rank(b.status));

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-text">Pedidos ({orders.length})</h1>

      {sorted.length === 0 ? (
        <p className="rounded-2xl bg-surface p-6 text-center text-sm text-text-muted shadow-xs">
          Aún no hay pedidos.
        </p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((order) => {
            const pendingPayments = order.payments.filter(
              (payment) => payment.status === "reported"
            ).length;
            return (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-xs transition-colors hover:bg-stone-100"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-text">
                      #{order.id.slice(0, 8).toUpperCase()}
                      <span className="ml-2 font-medium text-text-muted">
                        {order.customerName}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {order.delivery.kind === "pickup"
                        ? "Retiro"
                        : `Delivery ${order.delivery.zoneName ?? ""}`}{" "}
                      · {order.scheduledDate}
                      {pendingPayments > 0 && (
                        <span className="ml-2 font-semibold text-action-strong">
                          {pendingPayments} pago(s) por verificar
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-text">
                    {formatPrice(order.totalCents, order.currency)}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-xs text-text-muted">
        Estados: {Object.values(ORDER_STATUS_LABELS).join(" · ")}
      </p>
    </div>
  );
}
