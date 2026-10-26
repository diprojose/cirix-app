"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { pick } from "@/lib/locale";

/** Ask for the next code this long before the current one expires. */
const REFRESH_MARGIN_MS = 30_000;
const RETRY_MS = 8_000;

/**
 * The customer's personal QR. The code inside is signed and expires in about a
 * minute and a half, so this component fetches a new one before the old one
 * dies and again whenever the page comes back to the foreground. A screenshot
 * of it stops working almost immediately.
 */
export function RotatingQr({ slug }: { slug: string }) {
  const locale = useLocale();
  const [image, setImage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function refresh() {
      clearTimeout(timer);
      try {
        const response = await fetch(`/api/member/businesses/${encodeURIComponent(slug)}/qr`, { cache: "no-store" });
        if (!response.ok) throw new Error("qr/unavailable");
        const { token, expiresAt } = (await response.json()) as { token: string; expiresAt: string };
        const { toDataURL } = await import("qrcode");
        const url = await toDataURL(token, { errorCorrectionLevel: "M", margin: 2, width: 320 });
        if (!active) return;
        setImage(url);
        setFailed(false);
        timer = setTimeout(refresh, Math.max(5_000, Date.parse(expiresAt) - Date.now() - REFRESH_MARGIN_MS));
      } catch {
        if (!active) return;
        setFailed(true);
        timer = setTimeout(refresh, RETRY_MS);
      }
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [slug]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex size-64 items-center justify-center rounded-2xl bg-white p-2 shadow-xs">
        {image ? (
          <Image
            src={image}
            unoptimized
            width={240}
            height={240}
            alt={pick(locale, { es: "Tu código QR personal", en: "Your personal QR code" })}
            className="size-full"
          />
        ) : (
          <span className="text-label text-stone-500" role="status">
            {failed
              ? pick(locale, { es: "No se pudo cargar el código. Reintentando…", en: "Couldn't load the code. Retrying…" })
              : pick(locale, { es: "Generando tu código…", en: "Generating your code…" })}
          </span>
        )}
      </div>
      <p className="max-w-xs text-center text-caption text-text-muted">
        {pick(locale, {
          es: "Este código cambia solo cada minuto. No sirve una captura de pantalla.",
          en: "This code refreshes by itself every minute. A screenshot won't work.",
        })}
      </p>
    </div>
  );
}
