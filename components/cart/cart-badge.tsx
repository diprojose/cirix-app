"use client";

import { useCart } from "./cart-provider";

/**
 * CartBadge is the small count bubble overlaid on a cart icon. It renders nothing
 * when the cart is empty (or before it has loaded), so a fresh visitor sees a
 * clean icon. It positions itself in the top-right corner, so its host element
 * must be `relative`. Caps the label at "99+".
 */
export function CartBadge() {
  const { totalQuantity } = useCart();

  if (totalQuantity <= 0) {
    return null;
  }

  const label = totalQuantity > 99 ? "99+" : String(totalQuantity);

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -right-1 -top-1 grid h-[1.15rem] min-w-[1.15rem] place-items-center rounded-pill bg-action-fill px-1 text-[0.65rem] font-bold leading-none text-on-action shadow-action ring-2 ring-surface"
    >
      {label}
    </span>
  );
}
