import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOperator } from "@/lib/auth/dal";
import { formatPrice, formatVes } from "@/lib/format/money";
import { makeGetOrderById } from "@/modules/loyalty/ordering/infrastructure/di/ordering-container";
import type { OrderStatus } from "@/modules/loyalty/ordering/domain/value-objects/order-status";
import type { OrderAction } from "@/modules/loyalty/ordering/application/use-cases/advance-order-status";
import { PAYMENT_METHOD_LABELS } from "@/components/orders/order-status";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { FeedbackBanner } from "@/components/admin/feedback-banner";
import { advanceOrderAction, reviewPaymentAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Detalle de pedido" };

/** The lifecycle buttons offered per current status. */
const NEXT_ACTIONS: Record<OrderStatus, { action: OrderAction; label: string }[]> = {
  received: [{ action: "confirm", label: "Confirmar pedido" }],
  payment_reported: [{ action: "confirm", label: "Confirmar pedido" }],
  confirmed: [{ action: "preparing", label: "Iniciar preparación" }],
  preparing: [{ action: "ready", label: "Marcar listo" }],
  ready: [{ action: "delivered", label: "Marcar entregado" }],
  delivered: [],
  cancelled: [],
};

/**
 * Operator order detail: everything about one order plus the two levers the
 * operator owns — reviewing payment reports (verify/reject after checking the
 * bank) and advancing the lifecycle. Actions are plain forms bound to server
 * actions; failures come back as the `error` query param.
 */
export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOperator();
  const { id } = await params;
  const { error } = await searchParams;

  const result = await makeGetOrderById().execute({ orderId: id });
  if (!result.ok) {
    notFound();
  }
  const order = result.value;
  const shortId = order.id.slice(0, 8).toUpperCase();
  const lifecycle = NEXT_ACTIONS[order.status];
  const cancellable = order.status !== "delivered" && order.status !== "cancelled";
  const whatsappHref = `https://wa.me/${order.customerPhone.replace("+", "")}`;

  return (
    <div className="space-y-4">
      <FeedbackBanner error={error} />

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text">Pedido #{shortId}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Customer + fulfillment data. */}
      <section className="space-y-1.5 rounded-2xl bg-surface p-4 text-sm shadow-xs">
        <h2 className="text-sm font-bold text-text">Cliente</h2>
        <p className="flex justify-between gap-3">
          <span className="text-text-muted">Marca</span>
          <span className="font-medium text-text">{order.brandSlug}</span>
        </p>
        <p className="flex justify-between gap-3">
          <span className="text-text-muted">Nombre</span>
          <span className="font-medium text-text">{order.customerName}</span>
        </p>
        <p className="flex justify-between gap-3">
          <span className="text-text-muted">Teléfono</span>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium tabular-nums text-action-strong underline underline-offset-2"
          >
            {order.customerPhone}
          </a>
        </p>
        <p className="flex justify-between gap-3">
          <span className="text-text-muted">Entrega</span>
          <span className="font-medium text-text">
            {order.delivery.kind === "pickup"
              ? "Retiro en tienda"
              : `Delivery — ${order.delivery.zoneName ?? ""}`}
          </span>
        </p>
        <p className="flex justify-between gap-3">
          <span className="text-text-muted">Fecha acordada</span>
          <span className="font-medium tabular-nums text-text">{order.scheduledDate}</span>
        </p>
        <p className="flex justify-between gap-3">
          <span className="text-text-muted">Creado</span>
          <span className="font-medium tabular-nums text-text">
            {order.createdAt.slice(0, 16).replace("T", " ")}
          </span>
        </p>
        {order.notes && (
          <p className="rounded-xl bg-stone-100 px-3 py-2 text-text">{order.notes}</p>
        )}
      </section>

      {/* Lines and totals. */}
      <section className="space-y-2 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">Resumen</h2>
        <ul className="space-y-1 text-sm">
          {order.lines.map((line) => (
            <li key={line.productId} className="flex justify-between gap-3">
              <span className="text-text">
                {line.quantity}× {line.name}
              </span>
              <span className="font-medium tabular-nums text-text">
                {formatPrice(line.lineTotalCents, line.currency)}
              </span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-border pt-2 text-sm">
          <p className="flex justify-between">
            <span className="text-text-muted">Delivery</span>
            <span className="font-medium tabular-nums text-text">
              {order.deliveryFeeCents === 0
                ? "Gratis"
                : formatPrice(order.deliveryFeeCents, order.currency)}
            </span>
          </p>
          {order.discountCents > 0 && (
            <p className="flex justify-between">
              <span className="text-text-muted">Descuento</span>
              <span className="font-medium tabular-nums text-action-strong">
                −{formatPrice(order.discountCents, order.currency)}
              </span>
            </p>
          )}
          <p className="flex justify-between text-base font-bold text-text">
            <span>Total</span>
            <span className="tabular-nums">
              {formatPrice(order.totalCents, order.currency)}
            </span>
          </p>
          {order.exchangeRate && (
            <p className="text-right text-sm tabular-nums text-text-muted">
              {formatVes(order.totalCents, order.exchangeRate.vesPerUsd)} (tasa{" "}
              {order.exchangeRate.asOf})
            </p>
          )}
        </div>
      </section>

      {/* Payment reports with review actions. */}
      <section className="space-y-2 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">Pagos reportados</h2>
        {order.payments.length === 0 ? (
          <p className="text-sm text-text-muted">El cliente aún no reporta pagos.</p>
        ) : (
          <ul className="space-y-2">
            {order.payments.map((payment) => (
              <li key={payment.id} className="rounded-xl bg-stone-100 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text">
                      {PAYMENT_METHOD_LABELS[payment.method]}
                      {payment.reference && (
                        <span className="ml-2 font-medium tabular-nums text-text-muted">
                          Ref. {payment.reference}
                        </span>
                      )}
                    </p>
                    {payment.note && (
                      <p className="text-xs text-text-muted">{payment.note}</p>
                    )}
                    <p className="text-xs tabular-nums text-text-muted">
                      {payment.reportedAt.slice(0, 16).replace("T", " ")}
                    </p>
                  </div>
                  {payment.status === "reported" ? (
                    <div className="flex shrink-0 gap-2">
                      <form
                        action={reviewPaymentAction.bind(
                          null,
                          order.id,
                          payment.id,
                          "verified"
                        )}
                      >
                        <button
                          type="submit"
                          className="rounded-pill bg-ink px-3 py-1.5 text-xs font-semibold text-on-accent transition-transform active:scale-95"
                        >
                          Verificar
                        </button>
                      </form>
                      <form
                        action={reviewPaymentAction.bind(
                          null,
                          order.id,
                          payment.id,
                          "rejected"
                        )}
                      >
                        <button
                          type="submit"
                          className="rounded-pill border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger transition-transform active:scale-95"
                        >
                          Rechazar
                        </button>
                      </form>
                    </div>
                  ) : (
                    <span
                      className={`shrink-0 rounded-pill px-2.5 py-1 text-xs font-semibold ${
                        payment.status === "verified"
                          ? "bg-action-fill/15 text-action-strong"
                          : "bg-danger/10 text-danger"
                      }`}
                    >
                      {payment.status === "verified" ? "Verificado" : "Rechazado"}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Lifecycle commands. */}
      {(lifecycle.length > 0 || cancellable) && (
        <section className="space-y-2 rounded-2xl bg-surface p-4 shadow-xs">
          <h2 className="text-sm font-bold text-text">Acciones</h2>
          <div className="flex flex-wrap gap-2">
            {lifecycle.map(({ action, label }) => (
              <form key={action} action={advanceOrderAction.bind(null, order.id, action)}>
                <button
                  type="submit"
                  className="rounded-pill bg-gradient-to-r from-action-fill to-action-fill-strong px-5 py-2.5 text-sm font-semibold text-on-action shadow-action transition-transform active:scale-95"
                >
                  {label}
                </button>
              </form>
            ))}
            {cancellable && (
              <form action={advanceOrderAction.bind(null, order.id, "cancel")}>
                <button
                  type="submit"
                  className="rounded-pill border border-danger/40 px-5 py-2.5 text-sm font-semibold text-danger transition-transform active:scale-95"
                >
                  Cancelar pedido
                </button>
              </form>
            )}
          </div>
        </section>
      )}

      <p className="text-sm">
        <Link
          href={`/orders/${order.id}`}
          className="font-medium text-action-strong underline underline-offset-2"
        >
          Ver como cliente →
        </Link>
      </p>
    </div>
  );
}
