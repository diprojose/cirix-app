import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, pick } from "@/lib/i18n";

/**
 * Web App Manifest for the mixmag PWA.
 *
 * Enables install prompts on Android (via `beforeinstallprompt`) and standalone
 * launch on iOS/Android once the app is added to the home screen. Next.js serves
 * this at `/manifest.webmanifest` and injects the `<link rel="manifest">` tag
 * automatically.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: pick(DEFAULT_LOCALE, {
      es: "mixmag - tu supermercado",
      en: "mixmag - your grocery store",
    }),
    short_name: "mixmag",
    description: pick(DEFAULT_LOCALE, {
      es: "Supermercado a domicilio: pide tu mercado y acumula saldo con cada compra.",
      en: "Delivery grocery store: place your order and earn wallet credit with every purchase.",
    }),
    lang: DEFAULT_LOCALE,
    start_url: `/${DEFAULT_LOCALE}/loyalty`,
    scope: `/${DEFAULT_LOCALE}`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf9f6",
    theme_color: "#2d8249",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
