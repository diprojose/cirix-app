"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon } from "./icons";

/**
 * QuantityStepper is the pill-shaped quantity control (minus · violet badge ·
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
        onClick={() => commit(quantity + 1)}
        disabled={atMax}
        className="grid h-8 w-8 place-items-center rounded-pill text-ink transition-transform active:scale-90 disabled:text-sugar-400 disabled:active:scale-100"
      >
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
