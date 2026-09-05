"use client";

import { useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { pick } from "@/lib/locale";
import { useBrand } from "@/modules/loyalty/branding/ui/brand-provider";

/**
 * ReferralLinkCard shows the customer their shareable referral link with copy
 * and native-share controls. A small client island — it needs the clipboard and
 * Web Share APIs — that falls back to copying when share is unavailable.
 */
export function ReferralLinkCard({ url }: { url: string }) {
  const locale = useLocale();
  const { profile, basePath } = useBrand();
  const [copied, setCopied] = useState(false);
  const shareUrl = basePath
    ? `${url}${url.includes("?") ? "&" : "?"}brand=${encodeURIComponent(profile.slug)}`
    : url;

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — silently ignore.
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: pick(locale, {
            es: `Te invito a ${profile.displayName}`,
            en: `Join me at ${profile.displayName}`,
          }),
          text: pick(locale, {
            es: `Descubre ${profile.displayName} y disfruta beneficios con tus compras.`,
            en: `Discover ${profile.displayName} and enjoy rewards with every purchase.`,
          }),
          url: shareUrl,
        });
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
        {pick(locale, {
          es: `Invita a tus amigos a comprar en ${profile.displayName}. Ganas crédito cuando hacen su segunda compra.`,
          en: `Invite friends to shop at ${profile.displayName}. You earn credit when they make their second purchase.`,
        })}
      </p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={shareUrl}
          aria-label={pick(locale, { es: "Tu enlace de referido", en: "Your referral link" })}
          className="h-11 flex-1 truncate rounded-xl border border-border bg-bg px-3 text-xs text-text"
        />
        <button
          type="button"
          onClick={copy}
          className="h-11 shrink-0 rounded-pill bg-ink px-4 text-sm font-semibold text-on-accent transition-transform active:scale-95"
        >
          {copied
            ? pick(locale, { es: "Copiado", en: "Copied" })
            : pick(locale, { es: "Copiar", en: "Copy" })}
        </button>
      </div>
      <button
        type="button"
        onClick={share}
        className="flex h-11 w-full items-center justify-center rounded-pill bg-gradient-to-r from-action-fill to-action-fill-strong text-sm font-semibold text-on-action shadow-action transition-transform active:scale-[0.98]"
      >
        {pick(locale, { es: "Compartir enlace", en: "Share link" })}
      </button>
    </div>
  );
}
