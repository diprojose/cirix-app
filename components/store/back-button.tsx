"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "./icons";

/**
 * BackButton is the mobile ficha's "go back" affordance: a round, thumb-sized
 * control that pops the history stack via the router. It mirrors the styling of
 * the header controls (surface pill + subtle shadow) so the detail chrome reads
 * as part of the same app. Client-only because it depends on navigation state.
 */
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Volver"
      className={`grid h-11 w-11 place-items-center rounded-pill bg-surface text-ink shadow-xs transition-transform active:scale-95 ${className ?? ""}`}
    >
      <ArrowLeftIcon className="h-5 w-5" />
    </button>
  );
}
