import type { Metadata } from "next";
import { pick, type Locale } from "@/lib/locale";

export const SITE_URL = "https://www.cirixadv.com";
export const SITE_NAME = "Cirix Tech Portal";
export const SITE_DESCRIPTION = "Explore Cirix's technology portal: CRM, loyalty programs, workflow automation, AI support, and call tracking tools to grow your business.";

export function homeMetadata(locale: Locale): Metadata {
  const title = pick(locale, {
    en: "Cirix Tech Portal | CRM, Automation & AI",
    es: "Cirix Tech Portal | CRM, automatización e IA",
  });
  const description = pick(locale, {
    en: SITE_DESCRIPTION,
    es: "Explora el portal tecnológico de Cirix: CRM, programas de fidelización, automatización, soporte con IA y seguimiento de llamadas para hacer crecer tu negocio.",
  });

  return {
    title: { absolute: title },
    description,
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
