import type { Metadata } from "next";
import { pick, type Locale } from "@/lib/locale";

export const SITE_URL = "https://www.cirixadv.com";
export const SITE_NAME = "Cirix Tech Portal";
export const SITE_DESCRIPTION = "Explore Cirix's technology portal: CRM, loyalty programs, workflow automation, AI support, and call tracking tools to grow your business.";

export const SITE_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  alternateName: ["CIRIX", "cirixadv.com"],
  url: `${SITE_URL}/`,
  inLanguage: ["en", "es"],
};

export function homeMetadata(locale: Locale): Metadata {
  const title = pick(locale, {
    en: "CIRIX | Digital loyalty program for local businesses",
    es: "CIRIX | Programa de fidelización digital para negocios locales",
  });
  const description = pick(locale, {
    en: "CIRIX builds and runs digital stamp and points cards for restaurants, salons, shops and auto shops, so customers come back on your slow days.",
    es: "CIRIX crea y administra tarjetas digitales de sellos y puntos para restaurantes, salones, tiendas y talleres, para que tus clientes vuelvan en los días flojos.",
  });

  return {
    title: { absolute: title },
    description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: `/${locale}`,
      languages: { en: "/en", es: "/es", "x-default": "/en" },
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: `/${locale}`,
      locale: locale === "en" ? "en_US" : "es_ES",
      alternateLocale: locale === "en" ? "es_ES" : "en_US",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "CIRIX" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}
