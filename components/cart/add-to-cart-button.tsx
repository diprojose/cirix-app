"use client";

import { useEffect, useRef, useState } from "react";
import { useProductPurchase } from "./product-purchase-provider";

/**
 * AddToCartButton is the product detail page's primary CTA, wired to the cart. It
 * reads the product and selected quantity from the product-scoped purchase context
 * and adds them to the cart on click, briefly confirming with an "¡Agregado!"
 * state. When the product is unavailable it renders the disabled, muted state.
 * Rendered twice per page (desktop inline + fixed mobile bar); each instance owns
 * only its transient confirmation, so it stays a small building block.
 */
export function AddToCartButton({ className }: { className?: string }) {
  const { product, addToCart } = useProductPurchase();
  const [justAdded, setJustAdded] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    []
  );

  const handleClick = async () => {
    const added = await addToCart();
    if (!added) return;
    setJustAdded(true);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setJustAdded(false), 1600);
  };

  const label = !product.available
    ? "No disponible"
    : justAdded
      ? "¡Agregado!"
      : "Agregar al carrito";

  return (
    <button
      type="button"
      disabled={!product.available}
      onClick={handleClick}
      // The label swaps to a confirmation; announce it so the feedback is not
      // sighted-only.
      aria-live="polite"
      className={`flex h-14 w-full items-center justify-center rounded-pill bg-action-fill text-title font-semibold text-on-action shadow-action transition-[background-color,transform] duration-200 ease-out-quint hover:bg-action-fill-strong active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-fill focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none disabled:active:scale-100 ${className ?? ""}`}
    >
      {label}
    </button>
  );
}
