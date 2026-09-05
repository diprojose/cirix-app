"use client";

import { ShareIcon } from "./icons";

/**
 * ShareButton is the round share control in the detail page's top bar. It uses
 * the Web Share API when available (native share sheet on mobile) and falls back
 * to copying the current URL to the clipboard, so it degrades gracefully on
 * desktop browsers without share support.
 */
export function ShareButton({ title, className }: { title: string; className?: string }) {
  const onShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User dismissed the share sheet — nothing to do.
        return;
      }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // Clipboard unavailable — silently ignore.
      }
    }
  };

  return (
    <button
      type="button"
      aria-label="Compartir"
      onClick={onShare}
      className={`grid h-11 w-11 place-items-center rounded-pill bg-surface text-accent shadow-xs transition-transform active:scale-95 ${className ?? ""}`}
    >
      <ShareIcon className="h-5 w-5" />
    </button>
  );
}
