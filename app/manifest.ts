import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, pick } from "@/lib/i18n";

/**
 * Web App Manifest for the Cirix platform shell. Branded storefronts expose
 * their own manifest from the dynamic demo route.
 *
 * Enables install prompts on Android (via `beforeinstallprompt`) and standalone
 * launch on iOS/Android once the app is added to the home screen. Next.js serves
 * this at `/manifest.webmanifest` and injects the `<link rel="manifest">` tag
 * automatically.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: pick(DEFAULT_LOCALE, {
      es: "Cirix Tech Platform - tu supermercado",
      en: "Cirix Tech Platform - your grocery store",
    }),
    short_name: "Cirix Tech Platform",
    description: pick(DEFAULT_LOCALE, {
      es: "Supermercado a domicilio: pide tu mercado y acumula saldo con cada compra.",
      en: "Delivery grocery store: place your order and earn wallet credit with every purchase.",
    }),
    lang: DEFAULT_LOCALE,
    start_url: `/${DEFAULT_LOCALE}/loyalty`,
    scope: `/${DEFAULT_LOCALE}`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#051934",
    theme_color: "#051934",
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
