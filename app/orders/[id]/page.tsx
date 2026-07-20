import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth/dal";
import { formatPrice, formatVes } from "@/lib/format/money";
import { TopNav } from "@/components/store/top-nav";
import { SiteFooter } from "@/components/store/site-footer";
import { BottomNav } from "@/components/store/bottom-nav";
import { BackButton } from "@/components/store/back-button";
import { PaymentSection } from "@/components/orders/payment-section";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STEPS,
} from "@/components/orders/order-status";
import { makeGetOrderById } from "@/modules/ordering/infrastructure/di/ordering-container";
import { BUSINESS_PROFILE } from "@/modules/ordering/infrastructure/config/business-profile";
import type { OrderDto } from "@/modules/ordering/application/dtos/order-dto";

export const metadata: Metadata = {
  title: "Tu pedido",
  description: "Estado de tu pedido, datos de pago y confirmación por WhatsApp.",
};

/**
 * Order status page (primary adapter): the customer's receipt and tracking
 * screen, reachable by anyone holding the order URL (the random id is the
 * guest's credential). Shows the lifecycle timeline, the frozen totals in both
 * currencies, the payment instructions with the report form, and the WhatsApp
 * handoff — the confirmation channel Venezuelan commerce actually runs on.
 */
export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getViewer();

  const result = await makeGetOrderById().execute({ orderId: id });
  if (!result.ok) {
    notFound();
  }
  const order = result.value;

  const shortId = order.id.slice(0, 8).toUpperCase();
  const canReport = order.status === "received" || order.status === "payment_reported";

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {/* Desktop / web horizon: top navigation bar (hidden below md). */}
      <TopNav viewer={viewer} />

      {/* Mobile / PWA horizon: top bar — back · Pedido. */}
      <div className="mx-auto flex w-full max-w-[26rem] items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:hidden">
        <BackButton />
        <p className="flex-1 text-center text-base font-semibold text-text">
          Pedido #{shortId}
        </p>
        <span className="h-10 w-10" aria-hidden="true" />
      </div>

      <main className="flex-1 pb-28 md:pb-12">
        <div className="mx-auto w-full max-w-[26rem] space-y-4 px-5 pt-4 md:max-w-2xl md:pt-8">
          <h1 className="hidden text-2xl font-bold text-text md:block">
            Pedido #{shortId}
          </h1>

          <StatusCard order={order} />
          <SummaryCard order={order} />
          <PaymentSection
            orderId={order.id}
            profile={BUSINESS_PROFILE}
            canReport={canReport}
            payments={order.payments}
          />
          <WhatsAppCard order={order} shortId={shortId} />
        </div>
      </main>

      {/* Desktop / web horizon: footer. */}
      <SiteFooter />

      {/* Mobile / PWA horizon: floating tab bar. */}
      <BottomNav />
    </div>
  );
}

/** Lifecycle timeline plus fulfillment details. */
function StatusCard({ order }: { order: OrderDto }) {
  const cancelled = order.status === "cancelled";
  const currentIndex = ORDER_STATUS_STEPS.indexOf(order.status);

  return (
    <section className="space-y-3 rounded-2xl bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-text">Estado</h2>
        <span
          className={`rounded-pill px-3 py-1 text-xs font-semibold ${
            cancelled ? "bg-danger/10 text-danger" : "bg-cta/10 text-cta-strong"
          }`}
        >
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      {!cancelled && (
        <ol className="space-y-1.5">
          {ORDER_STATUS_STEPS.map((step, index) => {
            const reached = index <= currentIndex;
            return (
              <li key={step} className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-pill text-[10px] font-bold ${
                    reached ? "bg-cta text-on-cta" : "bg-sugar-200 text-sugar-500"
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`text-sm ${
                    reached ? "font-semibold text-text" : "text-text-muted"
                  }`}
                >
                  {ORDER_STATUS_LABELS[step]}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="space-y-1 border-t border-border pt-3 text-sm">
        <p className="flex justify-between gap-3">
          <span className="text-text-muted">
            {order.delivery.kind === "pickup" ? "Retiro en tienda" : "Delivery"}
          </span>
          <span className="font-medium text-text">
            {order.delivery.kind === "pickup"
              ? "Sin costo"
              : (order.delivery.zoneName ?? "")}
          </span>
        </p>
        <p className="flex justify-between gap-3">
          <span className="text-text-muted">Fecha acordada</span>
          <span className="font-medium tabular-nums text-text">{order.scheduledDate}</span>
        </p>
        {order.notes && (
          <p className="flex justify-between gap-3">
            <span className="text-text-muted">Notas</span>
            <span className="max-w-[60%] text-right font-medium text-text">{order.notes}</span>
          </p>
        )}
      </div>
    </section>
  );
}

/** Lines and totals, frozen at placement time, in dollars and bolívares. */
function SummaryCard({ order }: { order: OrderDto }) {
  return (
    <section className="space-y-3 rounded-2xl bg-surface p-4 shadow-xs">
      <h2 className="text-sm font-bold text-text">Resumen</h2>

      <ul className="space-y-2">
        {order.lines.map((line) => (
          <li key={line.productId} className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-sugar-100">
              {line.imageUrl ? (
                <Image
                  src={line.imageUrl}
                  alt={line.name}
                  fill
                  sizes="48px"
                  className="object-contain p-1"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-lg" aria-hidden="true">
                  🧁
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text">{line.name}</p>
              <p className="text-xs tabular-nums text-text-muted">
                {line.quantity} × {formatPrice(line.unitPriceCents, line.currency)}
              </p>
            </div>
            <span className="text-sm font-bold tabular-nums text-text">
              {formatPrice(line.lineTotalCents, line.currency)}
            </span>
          </li>
        ))}
      </ul>

      <div className="space-y-1 border-t border-border pt-3 text-sm">
        <p className="flex justify-between">
          <span className="text-text-muted">Subtotal</span>
          <span className="font-medium tabular-nums text-text">
            {formatPrice(order.subtotalCents, order.currency)}
          </span>
        </p>
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
            <span className="font-medium tabular-nums text-cta-strong">
              −{formatPrice(order.discountCents, order.currency)}
            </span>
          </p>
        )}
        <p className="flex justify-between text-base">
          <span className="font-bold text-text">Total</span>
          <span className="font-bold tabular-nums text-text">
            {formatPrice(order.totalCents, order.currency)}
          </span>
        </p>
        {order.exchangeRate && (
          <>
            <p className="text-right text-sm font-medium tabular-nums text-text-muted">
              {formatVes(order.totalCents, order.exchangeRate.vesPerUsd)}
            </p>
            <p className="text-xs text-text-muted">
              Tasa BCV congelada al hacer el pedido ({order.exchangeRate.asOf}):{" "}
              {formatVes(100, order.exchangeRate.vesPerUsd)} por $1.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

/** Hands the order summary off to the business's WhatsApp. */
function WhatsAppCard({ order, shortId }: { order: OrderDto; shortId: string }) {
  const lines = order.lines
    .map((line) => `• ${line.quantity}× ${line.name}`)
    .join("\n");
  const total = formatPrice(order.totalCents, order.currency);
  const totalVes = order.exchangeRate
    ? ` (${formatVes(order.totalCents, order.exchangeRate.vesPerUsd)})`
    : "";
  const fulfillment =
    order.delivery.kind === "pickup"
      ? `Retiro en tienda — ${order.scheduledDate}`
      : `Delivery ${order.delivery.zoneName ?? ""} — ${order.scheduledDate}`;

  const message =
    `Hola, soy ${order.customerName} 👋\n` +
    `Acabo de hacer el pedido #${shortId} en ${BUSINESS_PROFILE.name}:\n` +
    `${lines}\n` +
    `Total: ${total}${totalVes}\n` +
    `${fulfillment}`;

  const href = `https://wa.me/${BUSINESS_PROFILE.whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <section className="space-y-2 rounded-2xl bg-surface p-4 shadow-xs">
      <h2 className="text-sm font-bold text-text">Confirma por WhatsApp</h2>
      <p className="text-sm text-text-muted">
        Envíanos tu pedido por WhatsApp para coordinar el pago y la entrega más rápido.
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-[#25D366] text-sm font-semibold text-white transition-transform active:scale-[0.98]"
      >
        Enviar pedido por WhatsApp
      </a>
    </section>
  );
}
