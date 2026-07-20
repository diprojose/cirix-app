"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice, formatVes } from "@/lib/format/money";
import { useCart } from "@/components/cart/cart-provider";
import { placeOrderAction } from "@/app/checkout/actions";
import type { DeliveryZone } from "@/modules/ordering/domain/value-objects/delivery-method";
import type { ExchangeRateDto } from "@/modules/pricing/application/dtos/exchange-rate-dto";

/** Shared input styling for the checkout fields. */
const FIELD_CLASS =
  "h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text placeholder:text-sugar-400 focus:outline-none focus:ring-2 focus:ring-cta";

/**
 * CheckoutForm is the client body of the `/checkout` page: it reads the cart
 * from context, collects contact, delivery and scheduling data, shows the
 * order summary in dollars and bolívares, and submits everything (product ids
 * and quantities only — never prices) to the place-order server action. On
 * success it clears the cart and navigates to the order's status page.
 */
export function CheckoutForm({
  zones,
  exchangeRate,
}: {
  zones: DeliveryZone[];
  exchangeRate: ExchangeRateDto | null;
}) {
  const { cart, ready, clear } = useCart();
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryKind, setDeliveryKind] = useState<"pickup" | "delivery">("pickup");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Earliest selectable fulfillment day: today, in the customer's timezone.
  const minDate = useMemo(() => new Date().toLocaleDateString("en-CA"), []);

  if (!ready) {
    return <p className="py-16 text-center text-sm text-text-muted">Cargando…</p>;
  }

  if (cart === null || cart.isEmpty) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg font-bold text-text">Tu carrito está vacío</p>
        <p className="text-sm text-text-muted">
          Agrega productos antes de finalizar un pedido.
        </p>
        <Link
          href="/"
          className="flex h-12 items-center justify-center rounded-pill bg-gradient-to-r from-cta to-cta-strong px-6 text-sm font-semibold text-on-cta shadow-cta transition-transform active:scale-[0.98]"
        >
          Explorar productos
        </Link>
      </div>
    );
  }

  const currency = cart.currency ?? "USD";
  const selectedZone = zones.find((zone) => zone.id === zoneId) ?? null;
  const deliveryFeeCents =
    deliveryKind === "delivery" ? (selectedZone?.feeCents ?? 0) : 0;
  const totalCents = cart.subtotalCents + deliveryFeeCents;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || cart === null) return;

    setSubmitting(true);
    setError(null);

    const result = await placeOrderAction({
      customerName,
      customerPhone,
      items: cart.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
      })),
      delivery:
        deliveryKind === "pickup" ? { kind: "pickup" } : { kind: "delivery", zoneId },
      scheduledDate,
      notes,
    });

    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
      return;
    }

    await clear();
    router.push(`/orders/${result.orderId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contact data: the phone is how the business confirms the order. */}
      <section className="space-y-3 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">Tus datos</h2>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">Nombre</span>
          <input
            type="text"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Tu nombre y apellido"
            className={FIELD_CLASS}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">Teléfono (WhatsApp)</span>
          <input
            type="tel"
            required
            autoComplete="tel"
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            placeholder="0412-1234567"
            className={FIELD_CLASS}
          />
        </label>
      </section>

      {/* Fulfillment: pickup is free; delivery freezes the zone fee. */}
      <section className="space-y-3 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">Entrega</h2>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Método de entrega">
          <DeliveryOption
            label="Retiro en tienda"
            hint="Gratis"
            selected={deliveryKind === "pickup"}
            onSelect={() => setDeliveryKind("pickup")}
          />
          <DeliveryOption
            label="Delivery"
            hint="Según zona"
            selected={deliveryKind === "delivery"}
            onSelect={() => setDeliveryKind("delivery")}
          />
        </div>

        {deliveryKind === "delivery" && (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-text">Zona de entrega</span>
            <select
              required
              value={zoneId}
              onChange={(event) => setZoneId(event.target.value)}
              className={FIELD_CLASS}
            >
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} — {formatPrice(zone.feeCents, currency)}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">
            Fecha de {deliveryKind === "pickup" ? "retiro" : "entrega"}
          </span>
          <input
            type="date"
            required
            min={minDate}
            value={scheduledDate}
            onChange={(event) => setScheduledDate(event.target.value)}
            className={FIELD_CLASS}
          />
          <span className="block text-xs text-text-muted">
            Todo se prepara por encargo; el pastelero confirmará la fecha.
          </span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text">Notas (opcional)</span>
          <textarea
            maxLength={500}
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Personalización, dedicatoria, punto de referencia…"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-sugar-400 focus:outline-none focus:ring-2 focus:ring-cta"
          />
        </label>
      </section>

      {/* Order summary in both currencies. */}
      <section className="space-y-2 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">Resumen</h2>
        <SummaryRow label={`Subtotal (${cart.totalQuantity} art.)`}>
          {formatPrice(cart.subtotalCents, currency)}
        </SummaryRow>
        <SummaryRow label={deliveryKind === "pickup" ? "Retiro en tienda" : "Delivery"}>
          {deliveryFeeCents === 0 ? "Gratis" : formatPrice(deliveryFeeCents, currency)}
        </SummaryRow>
        <div className="border-t border-border pt-2">
          <SummaryRow label="Total" strong>
            {formatPrice(totalCents, currency)}
          </SummaryRow>
          {exchangeRate && (
            <p className="text-right text-sm font-medium tabular-nums text-text-muted">
              {formatVes(totalCents, exchangeRate.vesPerUsd)}
            </p>
          )}
        </div>
        {exchangeRate && (
          <p className="text-xs text-text-muted">
            Tasa BCV del {exchangeRate.asOf}: {formatVes(100, exchangeRate.vesPerUsd)} por $1.
          </p>
        )}
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex h-14 w-full items-center justify-center rounded-pill bg-gradient-to-r from-cta to-cta-strong text-base font-semibold text-on-cta shadow-cta transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {submitting ? "Enviando pedido…" : "Confirmar pedido"}
      </button>
      <p className="text-center text-xs text-text-muted">
        Después de confirmar verás los datos de pago (Pago Móvil, transferencia o Zelle).
      </p>
    </form>
  );
}

/** One selectable fulfillment option styled as a card. */
function DeliveryOption({
  label,
  hint,
  selected,
  onSelect,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex min-h-[3.5rem] flex-col items-start justify-center rounded-xl border px-4 py-2 text-left transition-colors ${
        selected
          ? "border-cta bg-cta/10 text-text"
          : "border-border bg-surface text-text-muted hover:border-sugar-300"
      }`}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs">{hint}</span>
    </button>
  );
}

/** One summary line (label left, amount right). */
function SummaryRow({
  label,
  strong = false,
  children,
}: {
  label: string;
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "text-sm font-bold text-text" : "text-sm text-text-muted"}>
        {label}
      </span>
      <span
        className={
          strong
            ? "text-lg font-bold tabular-nums text-text"
            : "text-sm font-medium tabular-nums text-text"
        }
      >
        {children}
      </span>
    </div>
  );
}
