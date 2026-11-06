import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, pick } from "@/lib/i18n";

/**
 * Web App Manifest of the customer app. Branded storefronts expose their own
 * manifest from the dynamic demo route.
 *
 * An installed app opens on the person's own area: their cards and points, or the
 * login that leads back there. `/me` carries no language, so the proxy sends each
 * phone to its own, and the scope covers both languages and the login.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/me",
    name: "Cirix",
    short_name: "Cirix",
    description: pick(DEFAULT_LOCALE, {
      es: "Tus tarjetas de sellos y tus puntos, en un solo lugar.",
      en: "Your stamp cards and points, all in one place.",
    }),
    lang: DEFAULT_LOCALE,
    start_url: "/me",
    scope: "/",
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
