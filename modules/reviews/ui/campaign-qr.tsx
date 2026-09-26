"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/locale";
import { QR_HEIGHT, QR_WIDTH } from "../lib/branded-qr";
import s from "./reviews-dashboard.module.css";

let brandAssets: Promise<string[]> | undefined;
function loadBrandAssets() {
  return brandAssets ??= Promise.all(["/brand/favicon.svg", "/brand/logo-white.svg"].map(async (path) => {
    const response = await fetch(path);
    if (!response.ok) throw new Error("qr/brand-unavailable");
    return response.text();
  })).catch((error) => { brandAssets = undefined; throw error; });
}

export function CampaignQr({ link, campaignId, name, locale }: {
  link: string; campaignId: string; name: string; locale: Locale;
}) {
  const [result, setResult] = useState<{ link: string; locale: Locale; png: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const png = result?.link === link && result.locale === locale ? result.png : "";
  useEffect(() => {
    let active = true;
    if (!link) return;
    async function generate() {
      try {
        const [{ brandedReviewQr }, [favicon, logo]] = await Promise.all([
          import("../lib/branded-qr"), loadBrandAssets(),
        ]);
        const svg = await brandedReviewQr(link, favicon, logo, locale);
        const image = new window.Image();
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        await image.decode();
        if (!active) return;
        const canvas = document.createElement("canvas");
        canvas.width = QR_WIDTH; canvas.height = QR_HEIGHT;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("qr/canvas-unavailable");
        context.drawImage(image, 0, 0);
        setResult({ link, locale, png: canvas.toDataURL("image/png") });
      } catch { if (active) setFailed(true); }
    }
    void generate();
    return () => { active = false; };
  }, [link, locale, attempt]);

  return <div className={s.qrBlock}>
    {png ? <Image className={s.qrPreview} src={png} width={QR_WIDTH} height={QR_HEIGHT} unoptimized
      alt={locale === "es" ? `QR de CIRIX para ${name}` : `CIRIX QR for ${name}`} />
      : <p className={s.qrPlaceholder} role="status">{failed
        ? (locale === "es" ? "No se pudo generar el QR." : "Could not generate the QR.")
        : (locale === "es" ? "Generando QR…" : "Generating QR…")}</p>}
    {png && <a className={s.button} href={png} download={`cirix-review-${campaignId}.png`}>
      {locale === "es" ? "Descargar QR" : "Download QR"}
    </a>}
    {failed && !png && <button className={s.button} onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>
      {locale === "es" ? "Reintentar" : "Try again"}
    </button>}
  </div>;
}
