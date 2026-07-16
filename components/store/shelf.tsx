import type { ReactNode } from "react";
import { BLEED } from "./layout";

/**
 * Shelf is a presentational, CSS-only horizontal carousel: an edge-to-edge
 * scroll-snap row with a hidden scrollbar and mandatory snapping, so the next
 * item always peeks and swipes settle cleanly on an item. With `rows={2}` items
 * pack into two rows that scroll sideways as columns (a denser catalog shelf);
 * from `md` up the two-row shelf unfolds into the desktop wide grid, so a single
 * product list drives both horizons. No client state, so it works inside a Server
 * Component. Each child must carry `snap-start` (via its own className) to snap.
 */
export function Shelf({
  rows = 1,
  padY = "",
  ariaLabel,
  children,
}: {
  rows?: 1 | 2;
  /** Vertical padding for the scroll box (e.g. room for bleeding art or shadows). */
  padY?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  // Edge-to-edge scroll box: bleed out of the 12px gutter, hide the scrollbar,
  // reset to a static, padded box on desktop.
  const scroll = `${BLEED} overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0`;

  // One row is a simple flex track; two rows pack into columns that scroll
  // sideways on mobile, then reflow into the desktop grid from md up.
  const layout =
    rows === 2
      ? "grid grid-flow-col grid-rows-2 auto-cols-[46%] gap-3 md:grid-flow-row md:grid-rows-none md:auto-cols-auto md:grid-cols-3 lg:grid-cols-4 md:overflow-visible md:snap-none"
      : "flex gap-3";

  return (
    <div aria-label={ariaLabel} className={`${scroll} ${layout} ${padY}`}>
      {children}
    </div>
  );
}
