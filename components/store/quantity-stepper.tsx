"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon } from "./icons";

/**
 * QuantityStepper is the pill-shaped quantity control shown beside the product
 * name on the detail page: a minus, a violet quantity badge and a plus. It owns
 * its local count (minimum 1) and is presentational for now — there is no cart
 * to receive the quantity yet — matching the rest of the storefront's controls.
 */
export function QuantityStepper({ className }: { className?: string }) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div
      className={`flex items-center gap-1 rounded-pill bg-surface p-1.5 shadow-xs ${className ?? ""}`}
    >
      <button
        type="button"
        aria-label="Quitar uno"
        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
        disabled={quantity <= 1}
        className="grid h-8 w-8 place-items-center rounded-pill text-ink transition-transform active:scale-90 disabled:text-sugar-400 disabled:active:scale-100"
      >
        <MinusIcon className="h-4 w-4" />
      </button>
      <span
        aria-live="polite"
        className="grid h-8 w-8 place-items-center rounded-pill bg-cta text-sm font-semibold tabular-nums text-on-cta"
      >
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Agregar uno"
        onClick={() => setQuantity((q) => q + 1)}
        className="grid h-8 w-8 place-items-center rounded-pill text-ink transition-transform active:scale-90"
      >
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
