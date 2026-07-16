"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format/money";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { BagIcon, TrashIcon } from "@/components/store/icons";
import { MAX_QUANTITY } from "@/modules/cart/domain/value-objects/quantity";
import type { CartLineDto } from "@/modules/cart/application/dtos/cart-dto";
import { useCart } from "./cart-provider";

/**
 * CartView is the client body of the `/cart` page. It renders straight from the
 * cart context: a loading skeleton until the cart has hydrated from storage (so
 * the empty state never flashes), then either an empty state or the line list plus
 * an order summary. The checkout CTA is an intentional "próximamente" placeholder
 * until the ordering context exists.
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

      <div className="rounded-2xl bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Subtotal</span>
          <span className="text-lg font-bold tabular-nums text-text">
            {formatPrice(cart.subtotalCents, currency)}
          </span>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          El envío y los detalles de entrega se calculan al finalizar el pedido.
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          disabled
          title="Próximamente"
          className="flex h-14 w-full cursor-not-allowed items-center justify-center rounded-pill bg-sugar-300 text-base font-semibold text-sugar-500"
        >
          Finalizar pedido (próximamente)
        </button>
        <button
          type="button"
          onClick={() => void clear()}
          className="w-full py-1 text-center text-sm font-medium text-text-muted underline-offset-2 transition-colors hover:text-danger hover:underline"
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
    <li className="flex gap-3 rounded-2xl bg-surface p-3 shadow-xs">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-sugar-100">
        {line.imageUrl ? (
          <Image
            src={line.imageUrl}
            alt={line.name}
            fill
            sizes="80px"
            className="object-contain p-1.5"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-2xl" aria-hidden="true">
            🧁
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-text">
            {line.name}
          </h3>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Quitar ${line.name}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-pill text-sugar-400 transition-colors hover:bg-sugar-100 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-0.5 text-xs tabular-nums text-text-muted">
          {formatPrice(line.unitPriceCents, line.currency)} c/u
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <QuantityStepper
            value={line.quantity}
            onChange={onQuantityChange}
            max={MAX_QUANTITY}
          />
          <span className="text-sm font-bold tabular-nums text-text">
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
      <div className="grid h-20 w-20 place-items-center rounded-pill bg-sugar-100 text-sugar-400">
        <BagIcon className="h-10 w-10" />
      </div>
      <div>
        <p className="text-lg font-bold text-text">Tu carrito está vacío</p>
        <p className="mt-1 text-sm text-text-muted">
          Agrega postres y productos para verlos aquí.
        </p>
      </div>
      <Link
        href="/"
        className="flex h-12 items-center justify-center rounded-pill bg-gradient-to-r from-cta to-cta-strong px-6 text-sm font-semibold text-on-cta shadow-cta transition-transform active:scale-[0.98]"
      >
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
        <li key={index} className="flex gap-3 rounded-2xl bg-surface p-3 shadow-xs">
          <div className="h-20 w-20 shrink-0 animate-pulse rounded-xl bg-sugar-100" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-3/4 animate-pulse rounded bg-sugar-100" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-sugar-100" />
            <div className="mt-4 h-8 w-24 animate-pulse rounded-pill bg-sugar-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}
