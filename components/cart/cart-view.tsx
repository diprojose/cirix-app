"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format/money";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { ProductThumb } from "@/components/store/product-thumb";
import { BagIcon, TrashIcon } from "@/components/store/icons";
import { MAX_QUANTITY } from "@/modules/cart/domain/value-objects/quantity";
import type { CartLineDto } from "@/modules/cart/application/dtos/cart-dto";
import { useCart } from "./cart-provider";

/** Primary CTA treatment, shared by the checkout link and the empty-state link. */
const CTA =
  "flex h-14 w-full items-center justify-center rounded-pill bg-action-fill text-title font-semibold text-on-action shadow-action transition-[background-color,transform] duration-200 ease-out-quint hover:bg-action-strong active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-fill focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

/**
 * CartView is the client body of the `/cart` page. It renders straight from the
 * cart context: a loading skeleton until the cart has hydrated from storage (so
 * the empty state never flashes), then either an empty state or the line list
 * plus an order summary. The checkout CTA hands off to `/checkout`, where the
 * ordering context takes over.
 */
export function CartView() {
  const { cart, ready, changeQuantity, removeItem, clear } = useCart();

  if (!ready) {
    return <CartSkeleton />;
  }

  if (cart === null || cart.isEmpty) {
    return <EmptyCart />;
  }

  const currency = cart.currency ?? "USD";

  return (
    <div className="space-y-6">
      <ul className="space-y-3">
        {cart.lines.map((line) => (
          <CartLineRow
            key={line.productId}
            line={line}
            onQuantityChange={(next) => void changeQuantity(line.productId, next)}
            onRemove={() => void removeItem(line.productId)}
          />
        ))}
      </ul>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <span className="text-body text-text-muted">Subtotal</span>
          <span className="text-price-lg font-bold tabular-nums text-text">
            {formatPrice(cart.subtotalCents, currency)}
          </span>
        </div>
        <p className="mt-1 text-caption text-text-muted">
          El envío y los detalles de entrega se calculan al finalizar el pedido.
        </p>
      </div>

      <div className="space-y-2">
        <Link href="/checkout" className={CTA}>
          Finalizar pedido
        </Link>
        <button
          type="button"
          onClick={() => void clear()}
          className="flex min-h-11 w-full items-center justify-center rounded-pill text-label font-medium text-text-muted transition-colors hover:bg-stone-100 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          Vaciar carrito
        </button>
      </div>
    </div>
  );
}

/** A single cart line: thumbnail, name, unit price, quantity control and total. */
function CartLineRow({
  line,
  onQuantityChange,
  onRemove,
}: {
  line: CartLineDto;
  onQuantityChange: (next: number) => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex gap-3 rounded-lg border border-border bg-surface p-3">
      <ProductThumb
        id={line.productId}
        name={line.name}
        imageUrl={line.imageUrl}
        className="h-20 w-20 shrink-0 rounded-md bg-accent-subtle"
        imageClassName="object-contain p-1.5"
        sizes="80px"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-title font-semibold leading-snug text-text">
            {line.name}
          </h3>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Quitar ${line.name}`}
            className="-mr-1 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-pill text-text-muted transition-colors hover:bg-stone-100 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-0.5 text-caption tabular-nums text-text-muted">
          {formatPrice(line.unitPriceCents, line.currency)} c/u
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <QuantityStepper value={line.quantity} onChange={onQuantityChange} max={MAX_QUANTITY} />
          <span className="text-title font-bold tabular-nums text-text">
            {formatPrice(line.lineTotalCents, line.currency)}
          </span>
        </div>
      </div>
    </li>
  );
}

/** Shown when the cart is empty after loading. */
function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-pill bg-stone-100 text-text-muted">
        <BagIcon className="h-10 w-10" />
      </div>
      <div>
        <p className="text-h-section font-bold text-text">Tu carrito está vacío</p>
        <p className="mt-1 text-body text-text-muted">Agrega productos para verlos aquí.</p>
      </div>
      <Link href="/" className={`${CTA} h-12 max-w-xs`}>
        Explorar productos
      </Link>
    </div>
  );
}

/** Placeholder rows shown while the cart hydrates from storage. */
function CartSkeleton() {
  return (
    <ul className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <li key={index} className="flex gap-3 rounded-lg border border-border bg-surface p-3">
          <div className="h-20 w-20 shrink-0 animate-pulse rounded-md bg-stone-100" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-3/4 animate-pulse rounded-sm bg-stone-100" />
            <div className="h-3 w-1/3 animate-pulse rounded-sm bg-stone-100" />
            <div className="mt-4 h-9 w-24 animate-pulse rounded-pill bg-stone-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}
