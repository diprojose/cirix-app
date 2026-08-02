"use client";

import type { ProductDto } from "@/modules/loyalty/catalog/application/dtos/product-dto";
import { MinusIcon, PlusIcon } from "@/components/store/icons";
import { useCart } from "./cart-provider";

/**
 * QuickAddButton is the add control on a {@link ProductCard}. It starts as a
 * single "+" and becomes a minus/count/plus stepper once the product is in the
 * cart, so filling a grocery basket never requires opening the detail page or
 * leaving the grid. The count comes straight from the cart, which makes the
 * grid double as a running summary of what you have picked.
 *
 * Touch targets are 44px via an invisible expanded hit area (`before:`) rather
 * than by growing the button, so the control stays visually compact inside a
 * dense three-column grid without failing the 44px rule.
 */
export function QuickAddButton({ product }: { product: ProductDto }) {
  const { cart, addItem, changeQuantity, removeItem } = useCart();

  const quantity = cart?.lines.find((line) => line.productId === product.id)?.quantity ?? 0;

  const add = () =>
    addItem({
      productId: product.id,
      name: product.name,
      unitPriceCents: product.priceCents,
      currency: product.currency,
      imageUrl: product.imageUrl,
      quantity: 1,
    });

  const decrement = () =>
    quantity <= 1 ? removeItem(product.id) : changeQuantity(product.id, quantity - 1);

  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={add}
        disabled={!product.available}
        aria-label={`Agregar ${product.name}`}
        className={`${HIT_AREA} relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-action-fill text-on-action shadow-action transition-[transform,background-color] duration-150 ease-out-quint hover:bg-action-strong active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-fill focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none disabled:active:scale-100`}
      >
        <PlusIcon className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="relative z-10 flex h-9 shrink-0 items-center gap-0.5 rounded-pill bg-action-fill text-on-action shadow-action">
      <button
        type="button"
        onClick={decrement}
        aria-label={quantity <= 1 ? `Quitar ${product.name}` : `Quitar una unidad de ${product.name}`}
        className={`${HIT_AREA} grid h-9 w-8 place-items-center rounded-pill transition-transform duration-150 ease-out-quint active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-on-action`}
      >
        <MinusIcon className="h-4 w-4" />
      </button>
      <span
        aria-live="polite"
        aria-label={`${quantity} en el carrito`}
        className="min-w-[1ch] text-center text-label font-bold tabular-nums"
      >
        {quantity}
      </span>
      <button
        type="button"
        onClick={add}
        aria-label={`Agregar otra unidad de ${product.name}`}
        className={`${HIT_AREA} grid h-9 w-8 place-items-center rounded-pill transition-transform duration-150 ease-out-quint active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-on-action`}
      >
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

// Expands the pressable area to 44px without changing the rendered size. Needs
// `relative` on the button itself so the pseudo-element anchors to it and not
// to the surrounding stepper.
const HIT_AREA =
  "relative before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']";
