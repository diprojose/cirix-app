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
    name: "mixmag — postres por pedido",
    short_name: "mixmag",
    description:
      "Tienda de postres artesanales hechos por pedido, con recetas exclusivas para suscriptores.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#e0669a",
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
