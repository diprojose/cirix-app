"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format/money";
import { useCart } from "@/components/cart/cart-provider";
import { placeOrderAction, validateCouponAction } from "@/app/checkout/actions";
import type { DeliveryZone } from "@/modules/loyalty/ordering/domain/value-objects/delivery-method";
import { LocalizedLink } from "@/components/localized-link";
import { brandHref, useBrand } from "@/modules/loyalty/branding/ui/brand-provider";
import { useLocale } from "@/components/locale-provider";
import { localizeHref } from "@/lib/locale";

/** Shared input styling for the checkout fields. */
const FIELD_CLASS =
  "h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-action-fill";

/**
 * CheckoutForm is the client body of the `/checkout` page: it reads the cart
 * from context, collects contact, delivery and scheduling data, shows the
 * order summary, and submits everything (product ids
 * and quantities only — never prices) to the place-order server action. On
 * success it clears the cart and navigates to the order's status page.
 */
export function CheckoutForm({
  zones,
  availableCreditCents,
  maxRedeemPctOfOrder,
}: {
  zones: DeliveryZone[];
  availableCreditCents: number;
  maxRedeemPctOfOrder: number;
}) {
  const { cart, ready, clear } = useCart();
  const { profile, basePath } = useBrand();
  const locale = useLocale();
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryKind, setDeliveryKind] = useState<"pickup" | "delivery">("pickup");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");
  const [useCredit, setUseCredit] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<
    { code: string; discountCents: number } | null
  >(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
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
        <LocalizedLink
          href="/loyalty"
          className="flex h-12 items-center justify-center rounded-pill bg-gradient-to-r from-action-fill to-action-fill-strong px-6 text-sm font-semibold text-on-action shadow-action transition-transform active:scale-[0.98]"
        >
          Explorar productos
        </LocalizedLink>
      </div>
    );
  }

  const currency = cart.currency ?? "USD";
  const selectedZone = zones.find((zone) => zone.id === zoneId) ?? null;
  const deliveryFeeCents =
    deliveryKind === "delivery" ? (selectedZone?.feeCents ?? 0) : 0;

  // A coupon and wallet credit are mutually exclusive (BR-07); a coupon wins when
  // both are set. All previews are UX only — the server re-validates on submit.
  const hasCredit = availableCreditCents > 0;
  const redeemCapCents = Math.floor((maxRedeemPctOfOrder / 100) * cart.subtotalCents);
  const creditDiscountCents =
    useCredit && hasCredit && appliedCoupon === null
      ? Math.min(availableCreditCents, redeemCapCents, cart.subtotalCents)
      : 0;
  const couponDiscountCents = appliedCoupon
    ? Math.min(appliedCoupon.discountCents, cart.subtotalCents)
    : 0;
  const discountCents = appliedCoupon ? couponDiscountCents : creditDiscountCents;
  const discountLabel = appliedCoupon ? `Cupón ${appliedCoupon.code}` : "Crédito aplicado";
  const totalCents = cart.subtotalCents + deliveryFeeCents - discountCents;

  async function handleApplyCoupon() {
    if (couponBusy || cart === null) return;
    const code = couponInput.trim();
    if (code === "") return;

    setCouponBusy(true);
    setCouponError(null);
    const result = await validateCouponAction({ code, subtotalCents: cart.subtotalCents });
    if (result.ok) {
      setAppliedCoupon({ code: result.code, discountCents: result.discountCents });
      setUseCredit(false);
    } else {
      setAppliedCoupon(null);
      setCouponError(result.message);
    }
    setCouponBusy(false);
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponError(null);
    setCouponInput("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || cart === null) return;

    setSubmitting(true);
    setError(null);

    const result = await placeOrderAction({
      brandSlug: profile.slug,
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
      redeemCredit: appliedCoupon ? false : useCredit && hasCredit,
      couponCode: appliedCoupon?.code,
    });

    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
      return;
    }

    await clear();
    router.push(localizeHref(locale, brandHref(`/orders/${result.orderId}`, basePath)));
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
            Elige el día en que quieres recibir o retirar tu mercado.
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
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-action-fill"
          />
        </label>
      </section>

      {/* Coupon: anyone (guests included) can apply a code. Excludes credit (BR-07). */}
      <section className="space-y-3 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">Cupón</h2>
        {appliedCoupon ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-text">
              <span className="font-bold tracking-wide">{appliedCoupon.code}</span> aplicado
              {couponDiscountCents > 0 && ` (−${formatPrice(couponDiscountCents, currency)})`}
            </span>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="shrink-0 rounded-pill border border-border px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:bg-stone-100"
            >
              Quitar
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(event) => setCouponInput(event.target.value)}
                placeholder="Código"
                className={`${FIELD_CLASS} uppercase`}
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={couponBusy}
                className="shrink-0 rounded-pill bg-ink px-5 text-sm font-semibold text-on-accent transition-transform active:scale-95 disabled:opacity-60"
              >
                {couponBusy ? "…" : "Aplicar"}
              </button>
            </div>
            {couponError && (
              <p role="alert" className="text-xs font-medium text-danger">
                {couponError}
              </p>
            )}
          </>
        )}
      </section>

      {/* Wallet credit: signed-in customers can pay part of the order with it.
          Hidden while a coupon is applied — the two never stack (BR-07). */}
      {hasCredit && appliedCoupon === null && (
        <section className="rounded-2xl bg-surface p-4 shadow-xs">
          <label className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-sm font-bold text-text">Usar mi crédito</span>
              <span className="block text-xs text-text-muted">
                Tienes {formatPrice(availableCreditCents, currency)} disponibles
              </span>
            </span>
            <input
              type="checkbox"
              checked={useCredit}
              onChange={(event) => setUseCredit(event.target.checked)}
              className="h-6 w-6 shrink-0 accent-action-fill"
            />
          </label>
        </section>
      )}

      {/* Order summary in both currencies. */}
      <section className="space-y-2 rounded-2xl bg-surface p-4 shadow-xs">
        <h2 className="text-sm font-bold text-text">Resumen</h2>
        <SummaryRow label={`Subtotal (${cart.totalQuantity} art.)`}>
          {formatPrice(cart.subtotalCents, currency)}
        </SummaryRow>
        <SummaryRow label={deliveryKind === "pickup" ? "Retiro en tienda" : "Delivery"}>
          {deliveryFeeCents === 0 ? "Gratis" : formatPrice(deliveryFeeCents, currency)}
        </SummaryRow>
        {discountCents > 0 && (
          <SummaryRow label={discountLabel}>
            −{formatPrice(discountCents, currency)}
          </SummaryRow>
        )}
        <div className="border-t border-border pt-2">
          <SummaryRow label="Total" strong>
            {formatPrice(totalCents, currency)}
          </SummaryRow>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex h-14 w-full items-center justify-center rounded-pill bg-gradient-to-r from-action-fill to-action-fill-strong text-base font-semibold text-on-action shadow-action transition-transform active:scale-[0.98] disabled:opacity-60"
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
          ? "border-action-fill bg-action-fill/10 text-text"
          : "border-border bg-surface text-text-muted hover:border-stone-300"
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
