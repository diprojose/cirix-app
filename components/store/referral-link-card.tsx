"use client";

import { useState } from "react";

/**
 * ReferralLinkCard shows the customer their shareable referral link with copy
 * and native-share controls. A small client island — it needs the clipboard and
 * Web Share APIs — that falls back to copying when share is unavailable.
 */
export function ReferralLinkCard({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — silently ignore.
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Te invito a mixmag", url });
        return;
      } catch {
        return;
      }
    }
    await copy();
  }

  return (
    <div className="space-y-3 rounded-2xl bg-surface p-4 shadow-xs">
      <p className="text-sm text-text-muted">
        Comparte tu enlace. Ganas crédito cuando tu invitado hace su{" "}
        <span className="font-semibold text-text">segunda compra</span>.
      </p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          aria-label="Tu enlace de referido"
          className="h-11 flex-1 truncate rounded-xl border border-border bg-bg px-3 text-xs text-text"
        />
        <button
          type="button"
          onClick={copy}
          className="h-11 shrink-0 rounded-pill bg-ink px-4 text-sm font-semibold text-on-accent transition-transform active:scale-95"
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <button
        type="button"
        onClick={share}
        className="flex h-11 w-full items-center justify-center rounded-pill bg-gradient-to-r from-cta to-cta-strong text-sm font-semibold text-on-cta shadow-cta transition-transform active:scale-[0.98]"
      >
        Compartir enlace
      </button>
    </div>
  );
}
