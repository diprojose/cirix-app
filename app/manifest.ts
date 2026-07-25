import type { MetadataRoute } from "next";

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
    name: "mixmag — tu supermercado",
    short_name: "mixmag",
    description:
      "Supermercado a domicilio: pide tu mercado y acumula saldo con cada compra.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Match the design tokens: stone-50 page background, brand-600 green.
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
