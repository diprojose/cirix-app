"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import s from "./reviews.module.css";

type Props = {
  rating: number | null; onChange: (value: number) => void;
  label: string; starLabel: string;
};

export function RatingSelector({ rating, onChange, label, starLabel }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, value: number) {
    let next: number;
    switch (event.key) {
      case "ArrowRight": case "ArrowDown": next = value === 5 ? 1 : value + 1; break;
      case "ArrowLeft": case "ArrowUp": next = value === 1 ? 5 : value - 1; break;
      case "Home": next = 1; break;
      case "End": next = 5; break;
      default: return;
    }
    event.preventDefault();
    setHover(null);
    onChange(next);
    buttons.current[next - 1]?.focus();
  }
  return <div className={s.stars} role="radiogroup" aria-label={label} onPointerLeave={() => setHover(null)}>
    {[1, 2, 3, 4, 5].map((value) => <button
      key={value} ref={(node) => { buttons.current[value - 1] = node; }}
      type="button" role="radio" aria-checked={rating === value}
      aria-label={starLabel.replace("{value}", String(value))}
      tabIndex={(rating ?? 1) === value ? 0 : -1}
      className={s.star} data-filled={value <= (hover ?? rating ?? 0)}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setHover(value); }}
      onKeyDown={(event) => handleKeyDown(event, value)}
      onClick={() => onChange(value)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 3 2.78 5.63L21 9.54l-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.93 1.06-6.2L3 9.54l6.22-.91L12 3Z" /></svg>
    </button>)}
  </div>;
}
