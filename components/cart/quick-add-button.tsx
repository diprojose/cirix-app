"use client";

import { useEffect, useRef, useState } from "react";
import type { ProductDto } from "@/modules/catalog/application/dtos/product-dto";
import { PlusIcon } from "@/components/store/icons";
import { useCart } from "./cart-provider";

/**
 * QuickAddButton is the "+" quick-add control on a {@link ProductCard}: it adds one
 * unit of the product to the cart straight from the grid, without visiting the
 * detail page. It nudges (rotates the "+") briefly to confirm, and disables itself
 * for unavailable products. A small client island inside the otherwise static card.
 */
export function QuickAddButton({ product }: { product: ProductDto }) {
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    []
  );

  const handleClick = async () => {
    const added = await addItem({
      productId: product.id,
      name: product.name,
      unitPriceCents: product.priceCents,
      currency: product.currency,
      imageUrl: product.imageUrl,
      quantity: 1,
    });
    if (!added) return;
    setJustAdded(true);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!product.available}
      aria-label={`Agregar ${product.name}`}
      className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-cta text-on-cta shadow-cta transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta-strong disabled:bg-sugar-300 disabled:text-sugar-500 disabled:shadow-none"
    >
      <PlusIcon
        className={`h-5 w-5 transition-transform duration-200 ${justAdded ? "rotate-90" : ""}`}
      />
    </button>
  );
}
