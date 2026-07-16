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
      ? "¡Agregado! ✓"
      : "Agregar al carrito";

  return (
    <button
      type="button"
      disabled={!product.available}
      onClick={handleClick}
      className={`flex h-14 w-full items-center justify-center rounded-pill bg-gradient-to-r from-cta to-cta-strong text-base font-semibold text-on-cta shadow-cta transition-transform active:scale-[0.98] disabled:from-sugar-300 disabled:to-sugar-300 disabled:text-sugar-500 disabled:shadow-none disabled:active:scale-100 ${className ?? ""}`}
    >
      {label}
    </button>
  );
}
