"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon } from "./icons";

/*
 * The visible button is 32px so the pill stays compact next to a product name,
 * but the pressable area is expanded to 44px with a transparent pseudo-element
 * so it still meets the touch-target minimum.
 */
const STEP_BUTTON =
  "relative grid h-8 w-8 place-items-center rounded-pill text-ink transition-transform duration-150 ease-out-quint hover:bg-stone-100 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:text-stone-400 disabled:hover:bg-transparent disabled:active:scale-100 before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']";

/**
 * QuantityStepper is the pill-shaped quantity control (minus · action badge ·
 * plus) used beside the product name and in the cart. It works in two modes:
 * uncontrolled (owns its own count, the storefront default) or controlled — pass
 * `value` + `onChange` to bind it to external state (e.g. the cart). `min`
 * (default 1) and optional `max` clamp the range and disable the end buttons.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  className,
}: {
  value?: number;
  onChange?: (next: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  const [internal, setInternal] = useState(min);
  const isControlled = value !== undefined;
  const quantity = isControlled ? value : internal;

  const commit = (next: number) => {
    const upperBounded = max !== undefined ? Math.min(max, next) : next;
    const clamped = Math.max(min, upperBounded);
    if (!isControlled) {
      setInternal(clamped);
    }
    onChange?.(clamped);
  };

  const atMin = quantity <= min;
  const atMax = max !== undefined && quantity >= max;

  return (
    <div
      className={`flex items-center gap-1 rounded-pill bg-surface p-1.5 shadow-xs ${className ?? ""}`}
    >
      <button
        type="button"
        aria-label="Quitar uno"
        onClick={() => commit(quantity - 1)}
        disabled={atMin}
        className={STEP_BUTTON}
      >
        <MinusIcon className="h-4 w-4" />
      </button>
      <span
        aria-live="polite"
        className="grid h-8 w-8 place-items-center rounded-pill bg-action-fill text-sm font-semibold tabular-nums text-on-action"
      >
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Agregar uno"
        onClick={() => commit(quantity + 1)}
        disabled={atMax}
        className={STEP_BUTTON}
      >
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
